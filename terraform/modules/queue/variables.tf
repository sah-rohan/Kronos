variable "name" {
  type = string
}

variable "visibility_timeout" {
  type = number
}

variable "max_receives" {
  type    = number
  default = 3
}
