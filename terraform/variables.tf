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
  default = "1780790400"
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
