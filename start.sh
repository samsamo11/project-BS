#!/bin/bash
# B.S Evaluation - Server Startup Script
APP_DIR="/home/z/my-project"
LOG_FILE="$APP_DIR/logs/server.log"
PID_FILE="$APP_DIR/logs/server.pid"

mkdir -p "$APP_DIR/logs"

# Load environment variables
if [ -f "$APP_DIR/.env.local" ]; then
  set -a
  source <(grep -v '^#' "$APP_DIR/.env.local" | grep -v '^$')
  set +a
fi
if [ -f "$APP_DIR/.env" ]; then
  set -a
  source <(grep -v '^#' "$APP_DIR/.env" | grep -v '^$')
  set +a
fi

# Kill old process
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
  fi
  rm -f "$PID_FILE"
fi

# Start server
cd "$APP_DIR"
nohup node --max-old-space-size=1024 .next/standalone/server.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "Server started PID: $(cat $PID_FILE)"
