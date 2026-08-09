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

variable "emailsync_zip" {
  type    = string
  default = "../backend/dist/emailsync.zip"
}

variable "jobsync_zip" {
  type    = string
  default = "../backend/dist/jobsync.zip"
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
