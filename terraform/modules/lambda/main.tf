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
