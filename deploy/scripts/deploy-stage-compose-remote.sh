#!/usr/bin/env bash
# Run on the Droplet after docker-compose.yml and .env are in $STAGE_DEPLOY_DIR (default /opt/stage).
set -euo pipefail

STAGE_DEPLOY_DIR="${STAGE_DEPLOY_DIR:-/opt/stage}"
cd "$STAGE_DEPLOY_DIR"

docker compose -f docker-compose.yml --env-file .env pull
docker compose -f docker-compose.yml --env-file .env up -d
