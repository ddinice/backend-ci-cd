#!/usr/bin/env bash
# Example: stage-smoke.sh http://192.168.49.2:30080
set -euo pipefail

BASE_URL="${1:?usage: $0 <base_url>}"
BASE_URL="${BASE_URL%/}"

echo "==> GET ${BASE_URL}/health"
curl -fsS -o /tmp/health.json -w "HTTP %{http_code}\n" "${BASE_URL}/health"
jq -e '.status == "ok"' /tmp/health.json >/dev/null

echo "==> GET ${BASE_URL}/orders"
curl -fsS -o /tmp/orders.json -w "HTTP %{http_code}\n" "${BASE_URL}/orders"
jq -e 'type == "array"' /tmp/orders.json >/dev/null

echo "==> smoke OK"
