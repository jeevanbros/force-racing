#!/bin/bash
# Double-click to start this client's demo. Settings live in tools/demo.conf.
#
# ONE port, everything on it — no address-bar juggling in front of a client:
#   /                site/            the website
#   /__present.html  theme + phone frame around the website (opens first)
#   /pitch/          pitch/public/    deck, proposal, pricing — when the folder exists
#   /film-player/    film-player/     when the folder exists
# CLIENT.md, brief/, source/, design/, film/ and pitch/self-PRIVATE.html are never served.
#
# Double-clicking again always restarts cleanly.

cd "$(dirname "$0")" || exit 1
source tools/demo.conf || { echo "tools/demo.conf missing"; read -r -p "Press Return."; exit 1; }

BIND=127.0.0.1
[ "$1" = "lan" ] && BIND=0.0.0.0
PIDFILE="/tmp/gale-demo-$(basename "$PWD").pids"

MOUNTS=()
[ -d pitch/public ] && MOUNTS+=(--mount /pitch/=pitch/public)
[ -d film-player ]  && MOUNTS+=(--mount /film-player/=film-player)

[ -f "$PIDFILE" ] && while read -r p; do kill "$p" 2>/dev/null; done < "$PIDFILE"
rm -f "$PIDFILE"
for pid in $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null); do
  if ps -p "$pid" -o command= 2>/dev/null | grep -qE "serve\.py|http\.server"; then
    kill "$pid" 2>/dev/null
  else
    echo "  Port $PORT is used by something that isn't a demo:"
    echo "    $(ps -p "$pid" -o command= 2>/dev/null | cut -c1-70)"
    echo "  Close that first, then run this again."
    read -r -p "  Press Return to quit."
    exit 1
  fi
done
sleep 0.3

nohup python3 tools/serve.py "$PORT" "$BIND" site --present tools/present.html "${MOUNTS[@]}" >/dev/null 2>&1 &
echo $! > "$PIDFILE"; disown 2>/dev/null

OK=no
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && { OK=yes; break; }
  sleep 0.25
done
# GALE_NO_OPEN=1 (used by gale-presenter check-demo) starts the server without opening a browser tab
[ "$OK" = yes ] && [ -z "${GALE_NO_OPEN:-}" ] && open "http://127.0.0.1:$PORT/__present.html"

HOST=127.0.0.1
if [ "$BIND" = "0.0.0.0" ]; then
  HOST=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
fi
BASE="http://$HOST:$PORT"
UPPER=$(echo "$NAME" | tr '[:lower:]' '[:upper:]')
clear
echo
echo "   $UPPER — demo is running"
echo "   ─────────────────────────────────────────────"
echo
if [ "$OK" = yes ]; then
  echo "     ●  Present      $BASE/__present.html"
  echo "                     L light · D dark · P phone frame · H hide bar"
  echo "     ●  Website      $BASE/"
  for f in pitch/public/*.html; do
    [ -e "$f" ] || continue
    page=$(basename "$f")
    [ "$page" = index.html ] && continue
    printf "     ●  %-12s %s/pitch/%s\n" "${page%.html}" "$BASE" "$page"
  done
  [ -d film-player ] && echo "     ●  Film         $BASE/film-player/"
else
  echo "     ✕  FAILED to start on port $PORT"
fi
if [ "$BIND" = "0.0.0.0" ]; then
  echo
  echo "   ON YOUR PHONE (same Wi-Fi) open:   $BASE/"
  echo "   Anyone on this Wi-Fi can open it while it runs — trusted networks only."
fi
[ -f pitch/self-PRIVATE.html ] && { echo; echo "   Your own notes are NOT served: open pitch/self-PRIVATE.html in Finder."; }
echo
echo "   You can close this window. To stop, double-click stop.command."
echo
sleep 3
