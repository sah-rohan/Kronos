variable "name" {
  type = string
}

variable "zip_path" {
  type = string
}

variable "handler" {
  type    = string
  default = "bootstrap"
}

variable "runtime" {
  type    = string
  default = "provided.al2023"
}

variable "architecture" {
  type    = string
  default = "arm64"
}

variable "timeout" {
  type    = number
  default = 30
}

variable "memory" {
  type    = number
  default = 256
}

variable "environment" {
  type    = map(string)
  default = {}
}

variable "ssm_parameter_arns" {
  type    = list(string)
  default = []
}

# Extra IAM statements for this function alone, beyond logs and its secrets.
variable "policy_statements" {
  type    = list(any)
  default = []
}
