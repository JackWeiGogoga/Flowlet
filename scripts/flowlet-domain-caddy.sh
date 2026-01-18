#!/usr/bin/env bash
set -euo pipefail

DOMAIN=${DOMAIN:-""}
APP_DOMAIN=${APP_DOMAIN:-""}
AUTH_DOMAIN=${AUTH_DOMAIN:-""}
EMAIL=${EMAIL:-""}
WEB_ROOT=${WEB_ROOT:-"/var/www/flowlet"}
BACKEND_PORT=${BACKEND_PORT:-"8080"}
KEYCLOAK_HTTP_PORT=${KEYCLOAK_HTTP_PORT:-"8180"}
FLOWLET_REALM=${FLOWLET_REALM:-"flowlet"}

if [ -z "$APP_DOMAIN" ] && [ -z "$DOMAIN" ]; then
  echo "[caddy] APP_DOMAIN or DOMAIN is required" >&2
  exit 1
fi

if [ -n "$DOMAIN" ] && [ -z "$APP_DOMAIN" ]; then
  APP_DOMAIN="$DOMAIN"
fi

if [ -z "$AUTH_DOMAIN" ]; then
  AUTH_DOMAIN="$APP_DOMAIN"
fi

if ! command -v caddy >/dev/null 2>&1; then
  echo "[caddy] caddy not found. Install it first." >&2
  exit 1
fi

mkdir -p /etc/caddy

cat <<EOF | sudo tee /etc/caddy/Caddyfile >/dev/null
${APP_DOMAIN} {
  encode gzip
  root * ${WEB_ROOT}
  file_server

  handle /api/* {
    reverse_proxy 127.0.0.1:${BACKEND_PORT}
  }

}

${AUTH_DOMAIN} {
  reverse_proxy 127.0.0.1:${KEYCLOAK_HTTP_PORT}
}
EOF

if [ -n "$EMAIL" ]; then
  sudo caddy fmt --overwrite /etc/caddy/Caddyfile >/dev/null
  sudo systemctl reload caddy
else
  sudo caddy fmt --overwrite /etc/caddy/Caddyfile >/dev/null
  sudo systemctl reload caddy
fi

cat <<EOF
[caddy] configured:
  app domain: ${APP_DOMAIN}
  auth domain: ${AUTH_DOMAIN}
  web root: ${WEB_ROOT}
  backend: http://127.0.0.1:${BACKEND_PORT}
  keycloak: http://127.0.0.1:${KEYCLOAK_HTTP_PORT}
EOF
