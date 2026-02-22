#!/bin/bash
# Chrome Web Store 提出用ZIPパッケージ作成スクリプト
# Usage: bash store/build-zip.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION=$(node -p "require('./manifest.json').version" 2>/dev/null || echo "1.0.0")
OUTPUT_NAME="otori-buster-v${VERSION}.zip"

cd "$PROJECT_DIR"

# zip が使える環境 (Linux/Mac/Git Bash with zip)
if command -v zip &>/dev/null; then
  rm -f "store/$OUTPUT_NAME"
  zip -r "store/$OUTPUT_NAME" manifest.json icons/ src/ -x "*.DS_Store"
else
  # Windows (PowerShell) - cygpath でWindowsパスに変換
  WIN_PROJECT=$(cygpath -w "$PROJECT_DIR" 2>/dev/null || echo "$PROJECT_DIR")
  WIN_OUTPUT=$(cygpath -w "$PROJECT_DIR/store/$OUTPUT_NAME" 2>/dev/null || echo "$PROJECT_DIR/store/$OUTPUT_NAME")
  powershell -Command "
    Set-Location '$WIN_PROJECT'
    if (Test-Path '$WIN_OUTPUT') { Remove-Item '$WIN_OUTPUT' }
    Compress-Archive -Path 'manifest.json','icons','src' -DestinationPath '$WIN_OUTPUT' -Force
  "
fi

SIZE=$(wc -c < "store/$OUTPUT_NAME" | tr -d ' ')
echo "Created: store/$OUTPUT_NAME (${SIZE} bytes)"
