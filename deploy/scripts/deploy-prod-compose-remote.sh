#!/usr/bin/env bash
set -euo pipefail
PROD_DEPLOY_DIR="${PROD_DEPLOY_DIR:-/opt/production}"
cd "$PROD_DEPLOY_DIR"
docker compose -f docker-compose.yml --env-file .env pull
docker compose -f docker-compose.yml --env-file .env up -d
