#!/bin/bash
# Double-click to stop this client's demo server.
cd "$(dirname "$0")" || exit 1
source tools/demo.conf 2>/dev/null
PIDFILE="/tmp/gale-demo-$(basename "$PWD").pids"
STOPPED=0
if [ -f "$PIDFILE" ]; then
  while read -r p; do kill "$p" 2>/dev/null && STOPPED=$((STOPPED+1)); done < "$PIDFILE"
  rm -f "$PIDFILE"
fi
for pid in $(lsof -nP -iTCP:"${PORT:-0}" -sTCP:LISTEN -t 2>/dev/null); do
  if ps -p "$pid" -o command= 2>/dev/null | grep -qE "serve\.py|http\.server"; then
    kill "$pid" 2>/dev/null && STOPPED=$((STOPPED+1))
  fi
done
clear; echo
[ "$STOPPED" -gt 0 ] && echo "   ${NAME:-Demo} stopped." || echo "   Nothing was running."
echo; sleep 2
