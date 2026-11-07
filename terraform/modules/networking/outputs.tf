output "app_subnet_ids" {
  value = aws_subnet.app[*].id
}

output "data_subnet_ids" {
  value = aws_subnet.data[*].id
}

output "lambda_sg_id" {
  value = aws_security_group.lambda.id
}

output "db_sg_id" {
  value = aws_security_group.db.id
}
