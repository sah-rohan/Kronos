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

variable "jobalerts_function_arn" {
  type = string
}

variable "jobalerts_function_name" {
  type = string
}

variable "jobalerts_schedule" {
  type    = string
  default = "rate(60 minutes)"
}

