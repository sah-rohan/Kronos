variable "name" {
  type = string
}

variable "bucket_name" {
  type = string
}

variable "domain_name" {
  type    = string
  default = ""
}

# ARN of an ACM cert (us-east-1, ISSUED) for domain_name, created + DNS-validated
# in the ACM console. Empty = keep the default CloudFront cert.
variable "acm_certificate_arn" {
  type    = string
  default = ""
}
