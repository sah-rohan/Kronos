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

resource "aws_cloudwatch_event_rule" "emailsync" {
  name                = "${var.name}-emailsync"
  schedule_expression = var.emailsync_schedule
}

resource "aws_cloudwatch_event_target" "emailsync" {
  rule = aws_cloudwatch_event_rule.emailsync.name
  arn  = var.emailsync_function_arn
}

resource "aws_lambda_permission" "emailsync" {
  statement_id  = "AllowEmailsyncSchedule"
  action        = "lambda:InvokeFunction"
  function_name = var.emailsync_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.emailsync.arn
}

# The standalone enrich cron is intentionally removed: the sync Lambda already
# runs the enricher inline every pass (enricher.Run), so a separate per-minute
# enrich invocation was duplicate work (extra Lambda + KMS decrypts). The enrich
# Lambda itself is left defined but un-triggered.

resource "aws_cloudwatch_event_rule" "jobsync" {
  name                = "${var.name}-jobsync"
  schedule_expression = var.jobsync_schedule
}

resource "aws_cloudwatch_event_target" "jobsync" {
  rule = aws_cloudwatch_event_rule.jobsync.name
  arn  = var.jobsync_function_arn
}

resource "aws_lambda_permission" "jobsync" {
  statement_id  = "AllowJobsyncSchedule"
  action        = "lambda:InvokeFunction"
  function_name = var.jobsync_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.jobsync.arn
}
