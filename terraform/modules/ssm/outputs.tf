output "names" {
  value = { for k, p in aws_ssm_parameter.this : k => p.name }
}

output "arns" {
  value = [for p in aws_ssm_parameter.this : p.arn]
}
