#!/usr/bin/env bash
set -euo pipefail

MODE=${MODE:-"ip"} # local | ip | domain
FLOWLET_IP=${FLOWLET_IP:-""}
FLOWLET_DOMAIN=${FLOWLET_DOMAIN:-""}
KEYCLOAK_DOMAIN=${KEYCLOAK_DOMAIN:-""}
FLOWLET_HOSTS=${FLOWLET_HOSTS:-""}
FLOWLET_REALM=${FLOWLET_REALM:-"flowlet"}
FLOWLET_CLIENT_ID=${FLOWLET_CLIENT_ID:-"flowlet-app"}

FRONTEND_PORT=${FRONTEND_PORT:-"5173"}
BACKEND_PORT=${BACKEND_PORT:-"8080"}
KEYCLOAK_HTTP_PORT=${KEYCLOAK_HTTP_PORT:-"8180"}
KEYCLOAK_HTTPS_PORT=${KEYCLOAK_HTTPS_PORT:-"8443"}
KEYCLOAK_MANAGEMENT_PORT=${KEYCLOAK_MANAGEMENT_PORT:-"9000"}
FRONTEND_PUBLIC_PORT=${FRONTEND_PUBLIC_PORT:-""}
BACKEND_PUBLIC_PORT=${BACKEND_PUBLIC_PORT:-""}

FRONTEND_SCHEME=${FRONTEND_SCHEME:-"https"}
BACKEND_SCHEME=${BACKEND_SCHEME:-"http"}
KEYCLOAK_SCHEME=${KEYCLOAK_SCHEME:-"https"}
KEYCLOAK_ADMIN_URL=${KEYCLOAK_ADMIN_URL:-""}
KEYCLOAK_PUBLIC_PORT=${KEYCLOAK_PUBLIC_PORT:-""}
FLOWLET_ALLOW_HTTP=${FLOWLET_ALLOW_HTTP:-""}

ENABLE_SELF_SIGNED_CERTS=${ENABLE_SELF_SIGNED_CERTS:-"true"}
ENABLE_OFFLINE_ACCESS=${ENABLE_OFFLINE_ACCESS:-"false"}
FLOWLET_MODEL_HUB_KEY=${FLOWLET_MODEL_HUB_KEY:-""}

SKIP_BUILD=${SKIP_BUILD:-"false"}
SKIP_FRONTEND=${SKIP_FRONTEND:-"false"}
SKIP_BACKEND=${SKIP_BACKEND:-"false"}
SKIP_KEYCLOAK=${SKIP_KEYCLOAK:-"false"}

LOG_DIR=${LOG_DIR:-"/tmp"}
USE_OPENRESTY=${USE_OPENRESTY:-""}
OPENRESTY_EMAIL=${OPENRESTY_EMAIL:-""}
OPENRESTY_WEB_ROOT=${OPENRESTY_WEB_ROOT:-"/var/www/flowlet"}

log() { printf "[deploy] %s\n" "$1"; }
fail() { printf "[deploy][error] %s\n" "$1" >&2; exit 1; }

is_ip() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

generate_cert() {
  local key_path=$1
  local crt_path=$2
  shift 2
  local -a hosts=("$@")
  local tmp
  tmp=$(mktemp)

  {
    echo "[req]"
    echo "default_bits = 2048"
    echo "prompt = no"
    echo "default_md = sha256"
    echo "req_extensions = v3_req"
    echo "distinguished_name = dn"
    echo ""
    echo "[dn]"
    echo "CN = ${hosts[0]}"
    echo ""
    echo "[v3_req]"
    echo "subjectAltName = @alt_names"
    echo ""
    echo "[alt_names]"
  } > "$tmp"

  local ip_idx=1
  local dns_idx=1
  for host in "${hosts[@]}"; do
    if is_ip "$host"; then
      echo "IP.${ip_idx} = ${host}" >> "$tmp"
      ip_idx=$((ip_idx + 1))
    else
      echo "DNS.${dns_idx} = ${host}" >> "$tmp"
      dns_idx=$((dns_idx + 1))
    fi
  done

  mkdir -p "$(dirname "$key_path")"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$key_path" \
    -out "$crt_path" \
    -config "$tmp" \
    -extensions v3_req >/dev/null 2>&1
  chmod 644 "$key_path" "$crt_path"
  rm -f "$tmp"
}

stop_port() {
  local port=$1
  local pids
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    log "stopping processes on port ${port}: ${pids}"
    kill $pids || true
  fi
}

if [ -z "$FLOWLET_HOSTS" ]; then
  case "$MODE" in
    local)
      FLOWLET_HOSTS="localhost"
      ;;
    ip)
      [ -n "$FLOWLET_IP" ] || fail "MODE=ip requires FLOWLET_IP"
      FLOWLET_HOSTS="localhost,${FLOWLET_IP}"
      ;;
    domain)
      [ -n "$FLOWLET_DOMAIN" ] || fail "MODE=domain requires FLOWLET_DOMAIN"
      FLOWLET_HOSTS="localhost,${FLOWLET_DOMAIN}"
      ;;
    *)
      fail "unknown MODE: $MODE (local|ip|domain)"
      ;;
  esac
fi

IFS=',' read -r -a HOSTS <<< "$FLOWLET_HOSTS"

if [ -n "$KEYCLOAK_DOMAIN" ]; then
  KEYCLOAK_HOSTNAME="$KEYCLOAK_DOMAIN"
elif [ -n "$FLOWLET_DOMAIN" ]; then
  KEYCLOAK_HOSTNAME="$FLOWLET_DOMAIN"
elif [ -n "$FLOWLET_IP" ]; then
  KEYCLOAK_HOSTNAME="$FLOWLET_IP"
else
  KEYCLOAK_HOSTNAME="localhost"
fi

if [ "$MODE" = "local" ]; then
  FRONTEND_SCHEME="http"
  KEYCLOAK_SCHEME="http"
  ENABLE_SELF_SIGNED_CERTS="false"
  ENABLE_OFFLINE_ACCESS="true"
  KEYCLOAK_PUBLIC_PORT="${KEYCLOAK_HTTP_PORT}"
fi

if [ -z "$KEYCLOAK_PUBLIC_PORT" ]; then
  if [ "$KEYCLOAK_SCHEME" = "https" ]; then
    if [ "$MODE" = "domain" ]; then
      KEYCLOAK_PUBLIC_PORT="443"
    else
      KEYCLOAK_PUBLIC_PORT="${KEYCLOAK_HTTPS_PORT}"
    fi
  else
    KEYCLOAK_PUBLIC_PORT="${KEYCLOAK_HTTP_PORT}"
  fi
fi

if [ -z "$FRONTEND_PUBLIC_PORT" ]; then
  if [ "$MODE" = "domain" ]; then
    FRONTEND_PUBLIC_PORT="443"
  else
    FRONTEND_PUBLIC_PORT="$FRONTEND_PORT"
  fi
fi
if [ -z "$BACKEND_PUBLIC_PORT" ]; then
  if [ "$MODE" = "domain" ]; then
    BACKEND_PUBLIC_PORT="443"
  else
    BACKEND_PUBLIC_PORT="$BACKEND_PORT"
  fi
fi

if [ -z "$FLOWLET_ALLOW_HTTP" ]; then
  if [ "$MODE" = "domain" ]; then
    FLOWLET_ALLOW_HTTP="false"
  else
    FLOWLET_ALLOW_HTTP="true"
  fi
fi

if [ "$KEYCLOAK_PUBLIC_PORT" = "443" ] || [ "$KEYCLOAK_PUBLIC_PORT" = "80" ]; then
  KEYCLOAK_PUBLIC_URL="${KEYCLOAK_SCHEME}://${KEYCLOAK_HOSTNAME}"
  KEYCLOAK_ISSUER="${KEYCLOAK_PUBLIC_URL}/realms/${FLOWLET_REALM}"
else
  KEYCLOAK_PUBLIC_URL="${KEYCLOAK_SCHEME}://${KEYCLOAK_HOSTNAME}:${KEYCLOAK_PUBLIC_PORT}"
  KEYCLOAK_ISSUER="${KEYCLOAK_PUBLIC_URL}/realms/${FLOWLET_REALM}"
fi
if [ -z "${KEYCLOAK_ADMIN_URL}" ]; then
  KEYCLOAK_ADMIN_URL="http://127.0.0.1:${KEYCLOAK_HTTP_PORT}"
fi

log "hosts=${FLOWLET_HOSTS}"
log "keycloak issuer=${KEYCLOAK_ISSUER}"
log "frontend=${FRONTEND_SCHEME}://<host>:${FRONTEND_PORT}"
log "backend=${BACKEND_SCHEME}://<host>:${BACKEND_PORT}"

if [ "$ENABLE_SELF_SIGNED_CERTS" = "true" ]; then
  log "generating frontend TLS cert"
  generate_cert "flowlet-frontend/ssl/dev.key" "flowlet-frontend/ssl/dev.crt" "${HOSTS[@]}"
  log "generating keycloak TLS cert"
  generate_cert "docker/keycloak-ssl/server.key" "docker/keycloak-ssl/server.crt" "${HOSTS[@]}"
fi

if [ "$SKIP_KEYCLOAK" != "true" ]; then
  KEYCLOAK_CERT_ENV=()
  if [ "$KEYCLOAK_SCHEME" = "https" ]; then
    KC_HTTPS_CERTIFICATE_FILE=${KC_HTTPS_CERTIFICATE_FILE:-"/opt/keycloak/conf/ssl/server.crt"}
    KC_HTTPS_CERTIFICATE_KEY_FILE=${KC_HTTPS_CERTIFICATE_KEY_FILE:-"/opt/keycloak/conf/ssl/server.key"}
    KEYCLOAK_CERT_ENV=(
      KC_HTTPS_CERTIFICATE_FILE="$KC_HTTPS_CERTIFICATE_FILE"
      KC_HTTPS_CERTIFICATE_KEY_FILE="$KC_HTTPS_CERTIFICATE_KEY_FILE"
    )
  fi

  log "starting keycloak via docker compose"
  KEYCLOAK_HOSTNAME="$KEYCLOAK_HOSTNAME" \
  KEYCLOAK_HTTP_PORT="$KEYCLOAK_HTTP_PORT" \
  KEYCLOAK_HTTPS_PORT="$KEYCLOAK_HTTPS_PORT" \
  KEYCLOAK_MANAGEMENT_PORT="$KEYCLOAK_MANAGEMENT_PORT" \
  KEYCLOAK_HOSTNAME_URL="$KEYCLOAK_PUBLIC_URL" \
  KEYCLOAK_HOSTNAME_ADMIN_URL="$KEYCLOAK_PUBLIC_URL" \
  ${KEYCLOAK_CERT_ENV[@]+"${KEYCLOAK_CERT_ENV[@]}"} \
  docker compose -f docker/docker-compose-keycloak.yml up -d --force-recreate

  log "initializing keycloak realm/client"
  KEYCLOAK_URL="$KEYCLOAK_ADMIN_URL" \
  KEYCLOAK_INSECURE="$ENABLE_SELF_SIGNED_CERTS" \
  FLOWLET_REALM="$FLOWLET_REALM" \
  FLOWLET_CLIENT_ID="$FLOWLET_CLIENT_ID" \
  FLOWLET_HOSTS="$FLOWLET_HOSTS" \
  FLOWLET_FRONTEND_PORT="$FRONTEND_PUBLIC_PORT" \
  FLOWLET_BACKEND_PORT="$BACKEND_PUBLIC_PORT" \
  FLOWLET_FRONTEND_SCHEME="$FRONTEND_SCHEME" \
  FLOWLET_BACKEND_SCHEME="$BACKEND_SCHEME" \
  FLOWLET_ALLOW_HTTP="$FLOWLET_ALLOW_HTTP" \
  FLOWLET_ENABLE_OFFLINE_ACCESS="$ENABLE_OFFLINE_ACCESS" \
  KEYCLOAK_FRONTEND_URL="${KEYCLOAK_PUBLIC_URL}" \
  bash flowlet-backend/scripts/keycloak-init.sh
fi

if [ "$SKIP_BACKEND" != "true" ]; then
  if [ "$ENABLE_SELF_SIGNED_CERTS" = "true" ] && [ "$KEYCLOAK_SCHEME" = "https" ]; then
    log "trusting keycloak cert in java cacerts"
    keytool -delete -alias flowlet-keycloak-dev -cacerts -storepass changeit >/dev/null 2>&1 || true
    if ! keytool -importcert -noprompt -trustcacerts \
      -alias flowlet-keycloak-dev \
      -file docker/keycloak-ssl/server.crt \
      -cacerts -storepass changeit >/dev/null; then
      log "warning: failed to import keycloak cert into java cacerts (permission denied)."
      log "warning: run with sudo or use a writable JDK if backend TLS validation fails."
    fi
  fi

  stop_port "$BACKEND_PORT"
  log "starting backend"
  env FLOWLET_OIDC_ISSUER="$KEYCLOAK_ISSUER" \
    FLOWLET_MODEL_HUB_KEY="$FLOWLET_MODEL_HUB_KEY" \
    bash -lc "cd flowlet-backend && nohup mvn -q spring-boot:run -Dspring-boot.run.profiles=prod > \"${LOG_DIR}/flowlet-backend.log\" 2>&1 &"
fi

if [ "$SKIP_FRONTEND" != "true" ]; then
  log "writing frontend env"
  cat <<EOF > flowlet-frontend/.env.local
VITE_KEYCLOAK_URL=${KEYCLOAK_ISSUER}
VITE_KEYCLOAK_CLIENT_ID=${FLOWLET_CLIENT_ID}
EOF

  FRONTEND_ENV=()
  if [ "$FRONTEND_SCHEME" = "http" ]; then
    FRONTEND_ENV=(VITE_HTTPS=false)
  fi

  stop_port "$FRONTEND_PORT"
  if [ "$SKIP_BUILD" != "true" ]; then
    log "building frontend"
    (cd flowlet-frontend && env "${FRONTEND_ENV[@]}" npm run build)
  fi

  if [ "$MODE" = "domain" ] && [ "${USE_OPENRESTY:-true}" = "true" ]; then
    if [ -z "${OPENRESTY_EMAIL}" ]; then
      fail "MODE=domain requires OPENRESTY_EMAIL when USE_OPENRESTY=true"
    fi
    log "configuring openresty for domain"
    APP_DOMAIN="${FLOWLET_DOMAIN}" \
    AUTH_DOMAIN="${KEYCLOAK_DOMAIN:-${FLOWLET_DOMAIN}}" \
    EMAIL="${OPENRESTY_EMAIL}" \
    WEB_ROOT="${OPENRESTY_WEB_ROOT}" \
    WEB_ROOT_SRC="$(pwd)/flowlet-frontend/dist" \
    SYNC_DIST="true" \
    KEYCLOAK_HTTP_PORT="${KEYCLOAK_HTTP_PORT}" \
    BACKEND_PORT="${BACKEND_PORT}" \
    bash scripts/flowlet-domain-openresty.sh
  else
    log "starting frontend preview"
    (cd flowlet-frontend && nohup env "${FRONTEND_ENV[@]}" npm run preview -- --host 0.0.0.0 --port "${FRONTEND_PORT}" \
      > "${LOG_DIR}/flowlet-frontend.log" 2>&1 &)
  fi
fi

log "done"
