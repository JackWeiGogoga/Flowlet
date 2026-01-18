#!/usr/bin/env sh
set -e

CA_PATH=${FLOWLET_CA_CERT_PATH:-"/caddy-data/caddy/pki/authorities/local/root.crt"}
ALIAS=${FLOWLET_CA_ALIAS:-"flowlet-caddy-root"}

if [ -f "${CA_PATH}" ]; then
  keytool -delete -alias "${ALIAS}" -cacerts -storepass changeit >/dev/null 2>&1 || true
  keytool -importcert -noprompt -trustcacerts \
    -alias "${ALIAS}" \
    -file "${CA_PATH}" \
    -cacerts -storepass changeit >/dev/null 2>&1 || true
fi

exec java ${JAVA_OPTS:-} -jar /app/app.jar
