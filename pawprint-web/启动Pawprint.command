#!/bin/zsh
# macOS launcher: double-click to build if needed and start the local server.
cd "$(dirname "$0")" || exit 1
[ -d node_modules ] || npm install
[ -d dist ] || npm run build
npm start
