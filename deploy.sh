#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="${WEB_ROOT:-/var/www/tempmail}"
WEB_USER="${WEB_USER:-www-data}"
WEB_GROUP="${WEB_GROUP:-www-data}"
NGINX_SERVICE="${NGINX_SERVICE:-nginx}"
RELOAD_NGINX="${RELOAD_NGINX:-1}"

RESTART_BACKEND="${RESTART_BACKEND:-1}"
BACKEND_SERVICE="${BACKEND_SERVICE:-}"
BACKEND_ENTRY="${BACKEND_ENTRY:-$APP_DIR/server/server.js}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
BACKEND_LOG="${BACKEND_LOG:-$APP_DIR/server/backend.log}"

msg() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fail() {
  echo "❌ $1" >&2
  exit 1
}

command -v npm >/dev/null 2>&1 || fail "npm tidak dijumpai"
command -v node >/dev/null 2>&1 || fail "node tidak dijumpai"

cd "$APP_DIR"

msg "Build frontend (Vite)"
npm run build
[[ -f "$APP_DIR/dist/index.html" ]] || fail "Build gagal: dist/index.html tiada"

msg "Sync frontend ke $WEB_ROOT"
mkdir -p "$WEB_ROOT"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$APP_DIR/dist/" "$WEB_ROOT/"
else
  rm -rf "$WEB_ROOT"/*
  cp -a "$APP_DIR/dist/." "$WEB_ROOT/"
fi
chown -R "$WEB_USER:$WEB_GROUP" "$WEB_ROOT"

if [[ "$RELOAD_NGINX" == "1" ]]; then
  if command -v nginx >/dev/null 2>&1; then
    msg "Validate + reload Nginx"
    nginx -t
    systemctl reload "$NGINX_SERVICE"
  else
    msg "Skip Nginx reload (nginx command tiada)"
  fi
fi

restart_backend_standalone() {
  msg "Restart backend standalone: $BACKEND_ENTRY"
  mapfile -t pids < <(ps -eo pid=,args= | awk -v entry="$BACKEND_ENTRY" '$0 ~ /node/ && index($0, entry) {print $1}')
  for pid in "${pids[@]:-}"; do
    [[ -n "$pid" ]] || continue
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  sleep 1

  mkdir -p "$(dirname "$BACKEND_LOG")"
  nohup node "$BACKEND_ENTRY" >>"$BACKEND_LOG" 2>&1 &
  backend_pid=$!
  sleep 2
  kill -0 "$backend_pid" 2>/dev/null || fail "Backend gagal start. Semak log: $BACKEND_LOG"
}

if [[ "$RESTART_BACKEND" == "1" ]]; then
  if [[ -n "$BACKEND_SERVICE" ]] && systemctl list-unit-files --type=service --no-pager 2>/dev/null | grep -q "^${BACKEND_SERVICE}\.service"; then
    msg "Restart backend service: $BACKEND_SERVICE"
    systemctl restart "$BACKEND_SERVICE"
  else
    restart_backend_standalone
  fi

  if command -v curl >/dev/null 2>&1; then
    msg "Backend health check :$BACKEND_PORT"
    ok=0
    for _ in $(seq 1 15); do
      if curl -s "http://127.0.0.1:${BACKEND_PORT}/api/route-not-found-check" | grep -q 'API route not found'; then
        ok=1
        break
      fi
      sleep 1
    done
    [[ "$ok" == "1" ]] || fail "Backend health check gagal pada port $BACKEND_PORT"
  fi
fi

msg "Deploy selesai ✅"
echo "Frontend: $WEB_ROOT"
if [[ "$RESTART_BACKEND" == "1" ]]; then
  echo "Backend: $BACKEND_ENTRY (port $BACKEND_PORT)"
fi
