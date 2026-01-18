#!/usr/bin/env bash
set -euo pipefail

DOMAIN=${DOMAIN:-""}
WEB_ROOT=${WEB_ROOT:-"/var/www/flowlet"}
BACKEND_PORT=${BACKEND_PORT:-"8080"}
KEYCLOAK_HTTP_PORT=${KEYCLOAK_HTTP_PORT:-"8180"}
FLOWLET_REALM=${FLOWLET_REALM:-"flowlet"}

if [ -z "$DOMAIN" ]; then
  echo "[nginx] DOMAIN is required" >&2
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "[nginx] nginx not found. Install it first." >&2
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "[nginx] certbot not found. Install it first." >&2
  exit 1
fi

sudo certbot certonly --nginx -d "${DOMAIN}"

cat <<EOF | sudo tee /etc/nginx/conf.d/flowlet.conf >/dev/null
server {
  listen 80;
  server_name ${DOMAIN};
  return 301 https://\$host\$request_uri;
}

server {
  listen 443 ssl http2;
  server_name ${DOMAIN};

  ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

  root ${WEB_ROOT};
  index index.html;

  location / {
    try_files \$uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:${BACKEND_PORT};
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /realms/ {
    proxy_pass http://127.0.0.1:${KEYCLOAK_HTTP_PORT}/realms/;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /admin/ {
    proxy_pass http://127.0.0.1:${KEYCLOAK_HTTP_PORT}/admin/;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF

sudo nginx -t
sudo systemctl reload nginx

cat <<EOF
[nginx] configured:
  domain: ${DOMAIN}
  web root: ${WEB_ROOT}
  backend: http://127.0.0.1:${BACKEND_PORT}
  keycloak: http://127.0.0.1:${KEYCLOAK_HTTP_PORT}
EOF
