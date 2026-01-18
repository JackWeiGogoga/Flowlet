#!/usr/bin/env sh
set -e

CERT_DIR=${CERT_DIR:-/certs}
HOST=${FLOWLET_PUBLIC_HOST:-""}

if [ -z "${HOST}" ]; then
  echo "[certgen] FLOWLET_PUBLIC_HOST is required" >&2
  exit 1
fi

mkdir -p "${CERT_DIR}"

if [ -f "${CERT_DIR}/server.crt" ] && [ -f "${CERT_DIR}/server.key" ]; then
  echo "[certgen] cert exists, skipping"
  exit 0
fi

cat > /tmp/ip_cert.cnf <<EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = v3_req
distinguished_name = dn

[dn]
CN = ${HOST}

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = ${HOST}
DNS.1 = localhost
EOF

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "${CERT_DIR}/server.key" \
  -out "${CERT_DIR}/server.crt" \
  -config /tmp/ip_cert.cnf \
  -extensions v3_req

chmod 600 "${CERT_DIR}/server.key"
chmod 644 "${CERT_DIR}/server.crt"
echo "[certgen] cert generated for ${HOST}"
