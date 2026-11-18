#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Building..."
(cd "$SCRIPT_DIR/.." && npm run build 2>/dev/null)

echo "Running tests..."
node "$SCRIPT_DIR/run-tests.js"
