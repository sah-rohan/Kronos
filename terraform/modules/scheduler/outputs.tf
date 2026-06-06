output "sync_rule_arn" {
  value = aws_cloudwatch_event_rule.sync.arn
}

output "enrich_rule_arn" {
  value = aws_cloudwatch_event_rule.enrich.arn
}
