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

# Job Board scraping (backend/cmd/jobsync) calls the GitHub API once a
# minute for two repos. GitHub's unauthenticated rate limit is only 60
# requests/hour, so at that cadence a token is required (5,000 req/hour
# authenticated) - create it once with:
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
  # jobsync never touches Postgres, so it only needs the GitHub token secret
  # - not module.ssm.arn (that one's for DATABASE_URL).
  jobsync_secret_arns = [
    data.aws_ssm_parameter.github_token.arn,
  ]
  jobs_cache_key = "jobs.json"
}

resource "random_string" "jobs_bucket" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

module "jobscache" {
  source      = "./modules/jobscache"
  bucket_name = "${var.project}-jobs-${random_string.jobs_bucket.result}"
}

module "api" {
  source             = "./modules/lambda"
  name               = "${var.project}-api"
  zip_path           = var.api_zip
  ssm_parameter_arns = local.secret_arns
  s3_read_arns       = ["${module.jobscache.bucket_arn}/${local.jobs_cache_key}"]
  environment = {
    DATABASE_URL_SSM     = module.ssm.name
    CLERK_SECRET_KEY_SSM = data.aws_ssm_parameter.clerk_secret.name
    ADMIN_CLERK_ID       = var.admin_clerk_id
    SEASON_START         = var.season_start
    LEETCODE_SESSION_SSM = data.aws_ssm_parameter.leetcode_session.name
    JOBS_BUCKET          = module.jobscache.bucket_name
    JOBS_KEY             = local.jobs_cache_key
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

module "jobsync" {
  source             = "./modules/lambda"
  name               = "${var.project}-jobsync"
  zip_path           = var.jobsync_zip
  ssm_parameter_arns = local.jobsync_secret_arns
  s3_write_arns      = ["${module.jobscache.bucket_arn}/${local.jobs_cache_key}"]
  environment = {
    GITHUB_TOKEN_SSM = data.aws_ssm_parameter.github_token.name
    JOBS_BUCKET      = module.jobscache.bucket_name
    JOBS_KEY         = local.jobs_cache_key
  }
}

module "apigateway" {
  source               = "./modules/apigateway"
  name                 = "${var.project}-http"
  lambda_invoke_arn    = module.api.invoke_arn
  lambda_function_name = module.api.function_name
}

module "scheduler" {
  source                   = "./modules/scheduler"
  name                     = var.project
  sync_function_arn        = module.sync.arn
  sync_function_name       = module.sync.function_name
  enrich_function_arn      = module.enrich.arn
  enrich_function_name     = module.enrich.function_name
  emailsync_function_arn   = module.emailsync.arn
  emailsync_function_name  = module.emailsync.function_name
  jobsync_function_arn     = module.jobsync.arn
  jobsync_function_name    = module.jobsync.function_name
}

module "frontend" {
  source              = "./modules/frontend"
  name                = "${var.project}-web"
  bucket_name         = "${var.project}-web-${random_string.bucket.result}"
  domain_name         = var.domain_name
  acm_certificate_arn = var.acm_certificate_arn
}
