#!/bin/sh
# Catalyst requires the configured port to be listening within its short
# startup window. Keep that public listener independent from Spring's own
# initialization, then forward requests once the application is ready.
set -eu

public_port="${X_ZOHO_CATALYST_LISTEN_PORT:-${PORT:-9000}}"
internal_port="${APP_INTERNAL_PORT:-18080}"

case "$public_port" in
  ''|*[!0-9]*)
    echo "X_ZOHO_CATALYST_LISTEN_PORT/PORT must be a numeric port" >&2
    exit 64
    ;;
esac

case "$internal_port" in
  ''|*[!0-9]*)
    echo "APP_INTERNAL_PORT must be a numeric port" >&2
    exit 64
    ;;
esac

proxy_pid=""
app_pid=""

cleanup() {
  [ -z "$app_pid" ] || kill "$app_pid" 2>/dev/null || true
  [ -z "$proxy_pid" ] || kill "$proxy_pid" 2>/dev/null || true
}

trap 'cleanup; exit 143' INT TERM
trap cleanup EXIT

# socat accepts Catalyst's connection immediately on the public port and
# connects to Spring only after Spring has completed its own startup.
socat "TCP-LISTEN:${public_port},fork,reuseaddr,keepalive" "TCP:127.0.0.1:${internal_port},retry=30,interval=1" &
proxy_pid=$!

java \
  -XX:TieredStopAtLevel=1 \
  -XX:MaxRAMPercentage=60.0 \
  -XX:+ExitOnOutOfMemoryError \
  -jar /app/app.jar \
  --server.port="$internal_port" \
  --server.address=127.0.0.1 &
app_pid=$!

set +e
wait "$app_pid"
app_status=$?
set -e

exit "$app_status"
