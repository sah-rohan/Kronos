variable "name" {
  type = string
}

variable "cidr" {
  type = string
}

variable "interface_endpoints" {
  type    = list(string)
  default = []
}
