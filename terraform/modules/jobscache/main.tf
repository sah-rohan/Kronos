# A private S3 bucket holding exactly one object: the latest scraped job
# list as JSON. The jobsync Lambda overwrites it once a minute; the api
# Lambda reads it on every GET /jobs request. This is the entire "database"
# for the Job Board feature - one file, refreshed on a schedule.
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
}

# Nothing in this bucket is ever served directly to browsers - only the two
# Lambdas touch it, over IAM - so block every form of public access.
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
