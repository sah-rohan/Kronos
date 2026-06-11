output "bucket" {
  value = aws_s3_bucket.site.id
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "url" {
  value = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "acm_validation_records" {
  value = local.use_domain ? [
    for o in aws_acm_certificate.site[0].domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ] : []
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.site.domain_name
}
