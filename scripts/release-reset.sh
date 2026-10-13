#!/usr/bin/env bash
set -euo pipefail

# Fresh-season reset.
#   ./scripts/release-reset.sh
#
# Clears ALL progress (solves/solutions/submissions/sync state) but KEEPS every
# user account, and sets SEASON_START to the exact moment you run this — on the
# live sync Lambda and in Terraform. Only solves after that instant count.

SEASON_TS=$(date +%s)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_FN="${SYNC_FN:-kronos-sync}"
SSM_DB="${SSM_DB:-/kronos/DATABASE_URL}"

echo "SEASON_START:  $SEASON_TS ($(date -u -r "$SEASON_TS" '+%Y-%m-%d %H:%M:%S UTC'))"
read -r -p "This clears ALL progress (users are kept). Type 'reset' to continue: " confirm
[ "$confirm" = "reset" ] || { echo "aborted"; exit 1; }

DB=$(aws ssm get-parameter --name "$SSM_DB" --with-decryption --query 'Parameter.Value' --output text)

echo "==> Clearing all progress (users kept)"
psql "$DB" -c "truncate table solutions, submissions, solves, sync_state, pending_confirmations restart identity;"

echo "==> Setting SEASON_START on live Lambda ($SYNC_FN)"
ENV_JSON=$(aws lambda get-function-configuration --function-name "$SYNC_FN" --query 'Environment.Variables' --output json)
MERGED=$(python3 -c "import json,sys; v=json.load(sys.stdin); v['SEASON_START']=sys.argv[1]; print(json.dumps({'Variables':v}))" "$SEASON_TS" <<<"$ENV_JSON")
aws lambda update-function-configuration --function-name "$SYNC_FN" --environment "$MERGED" >/dev/null
echo "    done"

echo "==> Persisting season_start in Terraform"
python3 - "$ROOT/terraform/variables.tf" "$SEASON_TS" <<'PY'
import re,sys
path,ts=sys.argv[1],sys.argv[2]
s=open(path).read()
s=re.sub(r'(variable "season_start"\s*\{[^}]*?default\s*=\s*")\d+(")', r'\g<1>'+ts+r'\g<2>', s, flags=re.S)
open(path,'w').write(s)
PY
echo "    terraform/variables.tf season_start -> $SEASON_TS"

echo "Done. Progress cleared, users kept. Tracking starts now ($SEASON_TS)."
