resource "aws_iam_role" "this" {
  name = "${var.name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "ssm" {
  count = length(var.ssm_parameter_arns) > 0 ? 1 : 0
  name  = "${var.name}-ssm"
  role  = aws_iam_role.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        # PutParameter lets the admin UI rotate the LeetCode session token into
        # its SSM SecureString parameter without a redeploy.
        Action   = ["ssm:GetParameter", "ssm:PutParameter"]
        Resource = var.ssm_parameter_arns
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3" {
  count = length(var.s3_read_arns) + length(var.s3_write_arns) > 0 ? 1 : 0
  name  = "${var.name}-s3"
  role  = aws_iam_role.this.id

  # Two separate statements so a Lambda that only reads (api) never gets
  # PutObject, and one that only writes (jobsync) never gets GetObject.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      length(var.s3_read_arns) > 0 ? [{
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = var.s3_read_arns
      }] : [],
      length(var.s3_write_arns) > 0 ? [{
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = var.s3_write_arns
      }] : []
    )
  })
}

resource "aws_lambda_function" "this" {
  function_name    = var.name
  role             = aws_iam_role.this.arn
  handler          = var.handler
  runtime          = var.runtime
  architectures    = [var.architecture]
  timeout          = var.timeout
  memory_size      = var.memory
  filename         = var.zip_path
  source_code_hash = filebase64sha256(var.zip_path)

  environment {
    variables = var.environment
  }
}
