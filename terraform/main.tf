terraform {
  required_version = ">= 1.5"
  backend "s3" {}
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "random_password" "db" {
  length  = 28
  special = false
}

resource "random_string" "bucket" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

module "database" {
  source     = "./modules/database"
  name       = "${var.project}-db"
  username   = var.db_username
  password   = random_password.db.result
  vpc_id     = data.aws_vpc.default.id
  subnet_ids = data.aws_subnets.default.ids
}

locals {
  database_url = "postgres://${var.db_username}:${random_password.db.result}@${module.database.endpoint}:${module.database.port}/${module.database.db_name}?sslmode=require"
}

module "ssm" {
  source = "./modules/ssm"
  name   = "/${var.project}/DATABASE_URL"
  value  = local.database_url
}

data "aws_ssm_parameter" "clerk_secret" {
  name = "/${var.project}/CLERK_SECRET_KEY"
}

data "aws_ssm_parameter" "leetcode_session" {
  name = "/${var.project}/LEETCODE_SESSION"
}

# Job Board scraping happens inside the api Lambda's GET /jobs route, which
# reads two GitHub READMEs on demand and caches the result in process memory
# (backend/internal/api/jobs.go). GitHub's unauthenticated rate limit is only
# 60 requests/hour, so a token is used to lift it to 5,000/hour - create it
# once with:
#   aws ssm put-parameter --name /kronos/GITHUB_TOKEN --type SecureString --value <a GitHub personal access token, no scopes needed for public repos>
data "aws_ssm_parameter" "github_token" {
  name = "/${var.project}/GITHUB_TOKEN"
}

locals {
  secret_arns = [
    module.ssm.arn,
    data.aws_ssm_parameter.clerk_secret.arn,
    data.aws_ssm_parameter.leetcode_session.arn,
  ]
  # The api Lambda additionally needs the GitHub token, since it's the one
  # scraping the job board now.
  api_secret_arns = concat(local.secret_arns, [
    data.aws_ssm_parameter.github_token.arn,
  ])
}

module "api" {
  source             = "./modules/lambda"
  name               = "${var.project}-api"
  zip_path           = var.api_zip
  ssm_parameter_arns = local.api_secret_arns
  environment = {
    DATABASE_URL_SSM     = module.ssm.name
    CLERK_SECRET_KEY_SSM = data.aws_ssm_parameter.clerk_secret.name
    ADMIN_CLERK_ID       = var.admin_clerk_id
    SEASON_START         = var.season_start
    LEETCODE_SESSION_SSM = data.aws_ssm_parameter.leetcode_session.name
    GITHUB_TOKEN_SSM     = data.aws_ssm_parameter.github_token.name
  }
}

module "sync" {
  source             = "./modules/lambda"
  name               = "${var.project}-sync"
  zip_path           = var.sync_zip
  ssm_parameter_arns = local.secret_arns
  environment = {
    DATABASE_URL_SSM     = module.ssm.name
    SEASON_START         = var.season_start
    LEETCODE_SESSION_SSM = data.aws_ssm_parameter.leetcode_session.name
  }
}

module "enrich" {
  source             = "./modules/lambda"
  name               = "${var.project}-enrich"
  zip_path           = var.enrich_zip
  ssm_parameter_arns = local.secret_arns
  environment = {
    DATABASE_URL_SSM     = module.ssm.name
    LEETCODE_SESSION_SSM = data.aws_ssm_parameter.leetcode_session.name
  }
}

module "emailsync" {
  source             = "./modules/lambda"
  name               = "${var.project}-emailsync"
  zip_path           = var.emailsync_zip
  ssm_parameter_arns = local.secret_arns
  environment = {
    DATABASE_URL_SSM     = module.ssm.name
    LEETCODE_SESSION_SSM = data.aws_ssm_parameter.leetcode_session.name
  }
}

module "apigateway" {
  source               = "./modules/apigateway"
  name                 = "${var.project}-http"
  lambda_invoke_arn    = module.api.invoke_arn
  lambda_function_name = module.api.function_name
}

module "scheduler" {
  source                  = "./modules/scheduler"
  name                    = var.project
  sync_function_arn       = module.sync.arn
  sync_function_name      = module.sync.function_name
  enrich_function_arn     = module.enrich.arn
  enrich_function_name    = module.enrich.function_name
  emailsync_function_arn  = module.emailsync.arn
  emailsync_function_name = module.emailsync.function_name
}

module "frontend" {
  source              = "./modules/frontend"
  name                = "${var.project}-web"
  bucket_name         = "${var.project}-web-${random_string.bucket.result}"
  domain_name         = var.domain_name
  acm_certificate_arn = var.acm_certificate_arn
}
