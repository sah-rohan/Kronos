# Kronos infrastructure (Terraform)

## Layout

```
terraform/
  main.tf variables.tf outputs.tf        root, wires the modules together
  modules/
    database/    RDS Postgres (publicly reachable, TLS + credentials)
    lambda/      reusable Go lambda (provided.al2023, arm64)
    apigateway/  HTTP API in front of the api lambda
    scheduler/   EventBridge rules: sync (1m), enrich (5m)
    frontend/    S3 + CloudFront for the React build
```

## Deploy

```bash
# 1. build the lambda zips
cd backend && ./build.sh            # -> backend/dist/{api,sync,enrich}.zip

# 2. provision
cd ../terraform
terraform init
terraform apply \
  -var db_password=... \
  -var clerk_secret_key=sk_live_... \
  -var leetcode_session=... \
  -var frontend_bucket_name=kronos-web-<unique>

# 3. load schema + seed (uses the database_endpoint output)
psql "$(terraform output -raw -state=terraform.tfstate)" -f ../backend/db/schema.sql
psql ... -f ../backend/db/seed_problems.sql

# 4. build + upload the frontend (set VITE_API_URL to the api_url output)
cd .. && VITE_API_URL=$(terraform -chdir=terraform output -raw api_url) npm run build
aws s3 sync dist s3://$(terraform -chdir=terraform output -raw frontend_bucket) --delete
aws cloudfront create-invalidation --distribution-id $(terraform -chdir=terraform output -raw cloudfront_distribution_id) --paths '/*'
```

## Notes

- RDS is publicly accessible to avoid a NAT gateway (~$32/mo) that VPC-bound
  lambdas would need to also reach leetcode.com. Lock it down by setting the
  database module's `allowed_cidrs`, and always connect with `sslmode=require`.
- Secrets are passed as Terraform variables -> lambda env. Move to AWS Secrets
  Manager if you want rotation.
- `season_start` is a unix timestamp (default June 5 2026).
