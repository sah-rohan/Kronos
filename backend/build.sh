#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p dist

for fn in api sync enrich; do
  GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -tags lambda.norpc -o dist/bootstrap "./cmd/$fn"
  (cd dist && zip -q "$fn.zip" bootstrap && rm bootstrap)
  echo "built dist/$fn.zip"
done
