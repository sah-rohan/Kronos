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

variable "enrich_schedule" {
  type    = string
  default = "rate(1 minute)"
}
