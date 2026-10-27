#!/bin/bash
# Double-click to run the demo so your PHONE can open it over the same Wi-Fi.
# Same folders as start.command; private notes are never served.
# Use only on a network you trust — anyone on the Wi-Fi can reach it while it runs.
exec "$(dirname "$0")/start.command" lan
