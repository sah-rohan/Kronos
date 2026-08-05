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

# The standalone enrich cron is intentionally removed: the sync Lambda already
# runs the enricher inline every pass (enricher.Run), so a separate per-minute
# enrich invocation was duplicate work (extra Lambda + KMS decrypts). The enrich
# Lambda itself is left defined but un-triggered.

resource "aws_cloudwatch_event_rule" "jobalerts" {
  name                = "${var.name}-jobalerts"
  schedule_expression = var.jobalerts_schedule
}

resource "aws_cloudwatch_event_target" "jobalerts" {
  rule = aws_cloudwatch_event_rule.jobalerts.name
  arn  = var.jobalerts_function_arn
}

resource "aws_lambda_permission" "jobalerts" {
  statement_id  = "AllowJobAlertsSchedule"
  action        = "lambda:InvokeFunction"
  function_name = var.jobalerts_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.jobalerts.arn
}

