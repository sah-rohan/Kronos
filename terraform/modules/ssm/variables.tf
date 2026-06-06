variable "prefix" {
  type = string
}

variable "keys" {
  type = list(string)
}

variable "secrets" {
  type      = map(string)
  sensitive = true
}
