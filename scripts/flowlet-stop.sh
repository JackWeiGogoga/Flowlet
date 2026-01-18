#!/usr/bin/env bash
set -euo pipefail

KEYCLOAK_COMPOSE=${KEYCLOAK_COMPOSE:-"docker/docker-compose-keycloak.yml"}
KEYCLOAK_KEEP_VOLUMES=${KEYCLOAK_KEEP_VOLUMES:-"true"}

stop_port() {
  local port=$1
  local pids
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "[stop] stopping processes on port ${port}: ${pids}"
    kill $pids || true
  fi
}

stop_port 5173
stop_port 8080

if [ "${KEYCLOAK_KEEP_VOLUMES}" = "true" ]; then
  echo "[stop] docker compose down (keep volumes)"
  docker compose -f "${KEYCLOAK_COMPOSE}" down
else
  echo "[stop] docker compose down -v (remove volumes)"
  docker compose -f "${KEYCLOAK_COMPOSE}" down -v
fi
