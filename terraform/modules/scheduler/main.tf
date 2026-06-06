resource "aws_cloudwatch_event_rule" "sync" {
  name                = "${var.name}-sync"
  schedule_expression = var.sync_schedule
}

resource "aws_cloudwatch_event_target" "sync" {
  rule = aws_cloudwatch_event_rule.sync.name
  arn  = var.sync_function_arn
}

resource "aws_lambda_permission" "sync" {
  statement_id  = "AllowSyncSchedule"
  action        = "lambda:InvokeFunction"
  function_name = var.sync_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.sync.arn
}

resource "aws_cloudwatch_event_rule" "enrich" {
  name                = "${var.name}-enrich"
  schedule_expression = var.enrich_schedule
}

resource "aws_cloudwatch_event_target" "enrich" {
  rule = aws_cloudwatch_event_rule.enrich.name
  arn  = var.enrich_function_arn
}

resource "aws_lambda_permission" "enrich" {
  statement_id  = "AllowEnrichSchedule"
  action        = "lambda:InvokeFunction"
  function_name = var.enrich_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.enrich.arn
}
