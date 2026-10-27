#!/usr/bin/env bash
# Install the standard Galeport demo controls into a client folder.
# Usage: install-demo-kit.sh <client-dir> "<Display Name>" <port>
# One port per client: site/, the presenter, pitch/public/ (/pitch/) and film-player/ all share it.
# Writes start.command, stop.command, start-on-phone.command at the client root and
# tools/serve.py, tools/demo.conf (+ tools/present.html unless the client has its own).
set -euo pipefail
KIT="$(cd "$(dirname "$0")" && pwd)/demo-kit"
DIR=$1; NAME=$2; PORT=$3
[ -d "$DIR/site" ] || { echo "no site/ in $DIR"; exit 1; }
mkdir -p "$DIR/tools"
cp "$KIT/start.command" "$KIT/stop.command" "$KIT/start-on-phone.command" "$DIR/"
chmod +x "$DIR"/*.command
cp "$KIT/tools/serve.py" "$DIR/tools/serve.py"
[ -f "$DIR/tools/present.html" ] || cp "$KIT/tools/present.html" "$DIR/tools/present.html"
{ echo "# Demo settings read by start.command / stop.command. One port, unique per client."
  echo "NAME=\"$NAME\""
  echo "PORT=$PORT"; } > "$DIR/tools/demo.conf"
echo "installed demo kit in $DIR (port $PORT)"
