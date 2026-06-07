# Deploying Kronos

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the Go
lambdas, runs `terraform apply`, loads the DB schema + seed, builds the React
app, and publishes it. AWS auth uses **GitHub OIDC** (no stored AWS keys), and
app secrets live in **AWS Parameter Store** (nothing sensitive in GitHub).

## One-time setup (all in the AWS Console)

### 1. Terraform state bucket
S3 → Create bucket, e.g. `kronos-tfstate-CHANGEME`, enable **Versioning**.

### 2. Put your secrets in Parameter Store
Systems Manager → **Parameter Store** → Create parameter (×3):

| Name | Type | Value |
|---|---|---|
| `/kronos/CLERK_SECRET_KEY` | SecureString | `sk_…` |
| `/kronos/LEETCODE_SESSION` | SecureString | burner LeetCode cookie |
| `/kronos/CLERK_PUBLISHABLE_KEY` | String | `pk_…` |

### 3. GitHub OIDC role (so Actions can deploy keylessly)
- IAM → **Identity providers → Add provider → OpenID Connect**
  - URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
- IAM → **Roles → Create role → Web identity** → that provider + audience.
  - Trust condition: `token.actions.githubusercontent.com:sub` =
    `repo:<your-gh-user>/<repo>:ref:refs/heads/main`
  - Attach **AdministratorAccess** (scope down later). Name it `kronos-github-deploy`.
  - Copy the **role ARN**.

### 4. Clerk (clerk.com)
Create the app, enable OAuth, turn on **Require admin approval**.

### 5. GitHub repo secrets
Repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | the role ARN from step 3 |
| `AWS_REGION` | e.g. `us-east-1` |
| `TF_STATE_BUCKET` | the bucket from step 1 |
| `ADMIN_CLERK_ID` | (optional) your Clerk user id, to make yourself admin |

## Deploy
```bash
git push origin main      # or run the Deploy workflow manually
```
The run logs print the **Site URL**.

## After the first deploy
- Clerk → **Allowed origins** → add the Site URL.
- Make yourself admin: sign in once (you'll be "pending"), copy your Clerk user id
  from the Clerk dashboard, set `ADMIN_CLERK_ID`, re-run the workflow.

## Rotating the LeetCode cookie (~every 2 weeks)
Update `/kronos/LEETCODE_SESSION` in Parameter Store — no redeploy needed (the
enricher reads it live).
