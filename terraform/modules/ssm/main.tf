resource "aws_ssm_parameter" "this" {
  for_each = toset(var.keys)

  name  = "${var.prefix}/${each.value}"
  type  = "SecureString"
  value = var.secrets[each.value]
}
