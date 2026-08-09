variable "name" {
  type = string
}

variable "sync_function_arn" {
  type = string
}

variable "sync_function_name" {
  type = string
}

variable "enrich_function_arn" {
  type = string
}

variable "enrich_function_name" {
  type = string
}

variable "emailsync_function_arn" {
  type = string
}

variable "emailsync_function_name" {
  type = string
}

variable "emailsync_schedule" {
  type    = string
  default = "rate(15 minutes)"
}

variable "sync_schedule" {
  type    = string
  default = "rate(1 minute)"
}

# Unused: the enrich cron was removed (sync enriches inline). Kept so the root
# module can still pass enrich_* without error.
variable "enrich_schedule" {
  type    = string
  default = "rate(1 minute)"
}

variable "jobsync_function_arn" {
  type = string
}

variable "jobsync_function_name" {
  type = string
}

# Every minute, same cadence as sync - see main.tf's comment on the
# GITHUB_TOKEN SSM parameter this cadence requires.
variable "jobsync_schedule" {
  type    = string
  default = "rate(1 minute)"
}
