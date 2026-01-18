#!/usr/bin/env bash
set -euo pipefail

APP_DOMAIN=${APP_DOMAIN:-""}
AUTH_DOMAIN=${AUTH_DOMAIN:-""}
WEB_ROOT=${WEB_ROOT:-"/var/www/flowlet"}
WEB_ROOT_SRC=${WEB_ROOT_SRC:-""}
SYNC_DIST=${SYNC_DIST:-"false"}
BACKEND_PORT=${BACKEND_PORT:-"8080"}
KEYCLOAK_HTTP_PORT=${KEYCLOAK_HTTP_PORT:-"8180"}
ACME_ROOT=${ACME_ROOT:-"/var/www/certbot"}
OPENRESTY_CONF_ROOT=${OPENRESTY_CONF_ROOT:-"/usr/local/openresty/nginx/conf"}
NGINX_CONF_DIR=${NGINX_CONF_DIR:-""}
EMAIL=${EMAIL:-""}

if [ -z "$APP_DOMAIN" ] || [ -z "$AUTH_DOMAIN" ]; then
  echo "[openresty] APP_DOMAIN and AUTH_DOMAIN are required" >&2
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "[openresty] certbot not found. Install certbot first." >&2
  exit 1
fi

if [ -z "$EMAIL" ]; then
  echo "[openresty] EMAIL is required for certbot" >&2
  exit 1
fi

if [ -z "$NGINX_CONF_DIR" ]; then
  if [ -d "${OPENRESTY_CONF_ROOT}" ]; then
    NGINX_CONF_DIR="${OPENRESTY_CONF_ROOT}/conf.d"
  else
    NGINX_CONF_DIR="/etc/nginx/conf.d"
  fi
fi

NGINX_BIN=${NGINX_BIN:-""}
if [ -z "$NGINX_BIN" ]; then
  if command -v nginx >/dev/null 2>&1; then
    NGINX_BIN=$(command -v nginx)
  elif [ -x "/usr/local/openresty/nginx/sbin/nginx" ]; then
    NGINX_BIN="/usr/local/openresty/nginx/sbin/nginx"
  fi
fi

if [ -z "$NGINX_BIN" ]; then
  echo "[openresty] nginx binary not found. Ensure OpenResty is installed." >&2
  exit 1
fi

if [ "${SYNC_DIST}" = "true" ]; then
  if [ -z "${WEB_ROOT_SRC}" ]; then
    echo "[openresty] WEB_ROOT_SRC is required when SYNC_DIST=true" >&2
    exit 1
  fi
  sudo mkdir -p "${WEB_ROOT}"
  sudo rsync -a --delete "${WEB_ROOT_SRC}/" "${WEB_ROOT}/"
  sudo chown -R www-data:www-data "${WEB_ROOT}" || true
  sudo chmod -R 755 "${WEB_ROOT}" || true
fi

mkdir -p "${ACME_ROOT}" "${NGINX_CONF_DIR}"

if [ -d "${OPENRESTY_CONF_ROOT}" ]; then
  if ! rg -n "conf.d/\\*\\.conf" "${OPENRESTY_CONF_ROOT}/nginx.conf" >/dev/null 2>&1; then
    sudo sed -i '/http {/a\\    include conf.d/*.conf;' "${OPENRESTY_CONF_ROOT}/nginx.conf"
  fi
fi

cat <<EOF | sudo tee "${NGINX_CONF_DIR}/flowlet.conf" >/dev/null
server {
  listen 80;
  server_name ${APP_DOMAIN} ${AUTH_DOMAIN};

  location /.well-known/acme-challenge/ {
    root ${ACME_ROOT};
  }

  location / {
    return 301 https://\$host\$request_uri;
  }
}
EOF

sudo "${NGINX_BIN}" -t
sudo "${NGINX_BIN}" -s reload || sudo "${NGINX_BIN}" || true

sudo certbot certonly --webroot -w "${ACME_ROOT}" -d "${APP_DOMAIN}" -d "${AUTH_DOMAIN}" \
  --agree-tos -m "${EMAIL}" --no-eff-email --non-interactive

cat <<EOF | sudo tee "${NGINX_CONF_DIR}/flowlet.conf" >/dev/null
server {
  listen 80;
  server_name ${APP_DOMAIN};
  return 301 https://\$host\$request_uri;
}

server {
  listen 80;
  server_name ${AUTH_DOMAIN};
  return 301 https://\$host\$request_uri;
}

server {
  listen 443 ssl http2;
  server_name ${APP_DOMAIN};

  ssl_certificate /etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem;

  root ${WEB_ROOT};
  index index.html;

  location / {
    try_files \$uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:${BACKEND_PORT};
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-Port 443;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }
}

server {
  listen 443 ssl http2;
  server_name ${AUTH_DOMAIN};

  ssl_certificate /etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:${KEYCLOAK_HTTP_PORT}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-Port 443;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }
}
EOF

sudo "${NGINX_BIN}" -t
sudo "${NGINX_BIN}" -s reload || sudo "${NGINX_BIN}" || true

cat <<EOF
[openresty] configured:
  app domain: ${APP_DOMAIN}
  auth domain: ${AUTH_DOMAIN}
  web root: ${WEB_ROOT}
  backend: http://127.0.0.1:${BACKEND_PORT}
  keycloak: http://127.0.0.1:${KEYCLOAK_HTTP_PORT}
EOF
