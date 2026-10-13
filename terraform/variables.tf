variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "kronos"
}

variable "db_username" {
  type    = string
  default = "kronos"
}

variable "season_start" {
  type    = string
  default = "1780874902"
}

variable "api_zip" {
  type    = string
  default = "../backend/dist/api.zip"
}

variable "sync_zip" {
  type    = string
  default = "../backend/dist/sync.zip"
}

variable "enrich_zip" {
  type    = string
  default = "../backend/dist/enrich.zip"
}

variable "admin_clerk_id" {
  type    = string
  default = "user_3EmSENtZcQZXU9q9ptLa7uedUGK"
}

variable "domain_name" {
  type    = string
  default = "usekronos.tech"
}

variable "acm_certificate_arn" {
  type    = string
  default = "arn:aws:acm:us-east-1:185708268938:certificate/8d6dbc11-c38b-46b3-b548-a48edf585ff9"
}

# Azure OpenAI, for the interview coach. The key itself lives in SSM at
# /{project}/AZURE_OPENAI_KEY; only its location is configured here.
variable "azure_openai_endpoint" {
  type    = string
  default = "https://forge3adc8d-openai.openai.azure.com"
}

# The Azure deployment name, not the model: "deep" is gpt-5, "balanced" and
# "fast" are gpt-5-mini.
variable "azure_openai_deployment" {
  type    = string
  default = "balanced"
}

variable "azure_openai_effort" {
  type    = string
  default = "medium"
}

# The interview grader runs on a stronger deployment than the interviewer.
variable "azure_openai_grader_deployment" {
  type    = string
  default = "deep"
}

variable "azure_openai_grader_effort" {
  type    = string
  default = "high"
}

variable "grade_zip" {
  type    = string
  default = "../backend/dist/grade.zip"
}
