output "api_url" {
  value = module.apigateway.api_url
}

output "frontend_url" {
  value = module.frontend.url
}

output "frontend_bucket" {
  value = module.frontend.bucket
}

output "cloudfront_distribution_id" {
  value = module.frontend.distribution_id
}

output "acm_validation_records" {
  value = module.frontend.acm_validation_records
}

output "cloudfront_domain" {
  value = module.frontend.cloudfront_domain
}

output "database_endpoint" {
  value = module.database.endpoint
}

output "database_url" {
  value     = local.database_url
  sensitive = true
}
