#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[restart] stopping services"
KEYCLOAK_KEEP_VOLUMES=${KEYCLOAK_KEEP_VOLUMES:-"true"} \
  "${SCRIPT_DIR}/flowlet-stop.sh"

echo "[restart] starting services"
"${SCRIPT_DIR}/flowlet-deploy.sh"
