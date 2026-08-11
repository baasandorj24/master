#!/usr/bin/env bash
# task web-ийг macOS дээр байнгын ажиллуулах (LaunchAgent).
#
#   ./install-macos.sh            # суулгаж, шууд асаана
#   ./install-macos.sh status     # төлөв харах
#   ./install-macos.sh logs       # логийг хөтлөх
#   ./install-macos.sh uninstall  # устгах
#   ./install-macos.sh print      # зөвхөн plist-ийг хэвлэх (суулгахгүй)
#
# Тохируулах хувьсагчид:
#   PORT=9000 ./install-macos.sh
#   TASK_FILE=~/Documents/tasks.json ./install-macos.sh
#   READ_ONLY=1 ./install-macos.sh

set -euo pipefail

LABEL="com.task.web"
PORT="${PORT:-8787}"
TASK_FILE="${TASK_FILE:-$HOME/.tasks.json}"
READ_ONLY="${READ_ONLY:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_PY="$(cd "$SCRIPT_DIR/.." && pwd)/task.py"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"
LOG="$LOG_DIR/task-web.log"
ERR="$LOG_DIR/task-web.err.log"

PYTHON="${PYTHON:-$(command -v python3 || true)}"
if [ -z "$PYTHON" ]; then
  echo "Алдаа: python3 олдсонгүй. 'xcode-select --install' эсвэл 'brew install python'" >&2
  exit 1
fi

if [ ! -f "$TASK_PY" ]; then
  echo "Алдаа: $TASK_PY олдсонгүй." >&2
  exit 1
fi

xml_escape() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}

make_plist() {
  local extra=""
  if [ -n "$READ_ONLY" ]; then
    extra="    <string>--read-only</string>"
  fi

  cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "$PYTHON")</string>
    <string>$(xml_escape "$TASK_PY")</string>
    <string>web</string>
    <string>--port</string>
    <string>$PORT</string>
$extra
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>TASK_FILE</key>
    <string>$(xml_escape "$TASK_FILE")</string>
    <key>PYTHONUNBUFFERED</key>
    <string>1</string>
    <key>PYTHONDONTWRITEBYTECODE</key>
    <string>1</string>
  </dict>

  <!-- Нэвтрэх бүрд асаана, унтарвал дахин асаана. -->
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>ProcessType</key>
  <string>Background</string>

  <key>StandardOutPath</key>
  <string>$(xml_escape "$LOG")</string>
  <key>StandardErrorPath</key>
  <string>$(xml_escape "$ERR")</string>
</dict>
</plist>
PLIST
}

domain="gui/$(id -u)"

do_install() {
  mkdir -p "$(dirname "$PLIST")" "$LOG_DIR"
  make_plist > "$PLIST"
  plutil -lint "$PLIST" >/dev/null

  # Хуучин хувилбар ажиллаж байвал эхлээд зогсооно.
  launchctl bootout "$domain/$LABEL" 2>/dev/null || true
  launchctl bootstrap "$domain" "$PLIST" 2>/dev/null \
    || launchctl load -w "$PLIST"
  launchctl enable "$domain/$LABEL" 2>/dev/null || true

  sleep 1
  echo "Суулгалаа: $PLIST"
  echo "Хаяг:      http://127.0.0.1:$PORT/"
  echo "Өгөгдөл:   $TASK_FILE"
  echo "Лог:       $LOG"
  echo
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then
    echo "Сервис ажиллаж байна."
  else
    echo "Хараахан хариу өгөхгүй байна. Логийг шалгана уу: tail -f $LOG $ERR" >&2
  fi
}

do_uninstall() {
  launchctl bootout "$domain/$LABEL" 2>/dev/null \
    || launchctl unload -w "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Устгалаа. Таскийн өгөгдөл ($TASK_FILE) хэвээр үлдсэн."
}

do_status() {
  if launchctl print "$domain/$LABEL" >/dev/null 2>&1; then
    launchctl print "$domain/$LABEL" | grep -E "state|pid|last exit" || true
  else
    echo "Сервис ачаалагдаагүй байна."
  fi
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then
    echo "HTTP: http://127.0.0.1:$PORT/ хариу өгч байна."
  else
    echo "HTTP: хариу өгөхгүй байна."
  fi
}

case "${1:-install}" in
  install)   do_install ;;
  uninstall) do_uninstall ;;
  status)    do_status ;;
  logs)      tail -f "$LOG" "$ERR" ;;
  print)     make_plist ;;
  *)
    echo "Хэрэглээ: $0 [install|uninstall|status|logs|print]" >&2
    exit 1
    ;;
esac
