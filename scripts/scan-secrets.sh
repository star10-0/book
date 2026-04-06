#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${1:-.gitleaks.toml}"

if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks detect --config "$CONFIG_PATH" --redact --verbose
fi

if command -v docker >/dev/null 2>&1; then
  exec docker run --rm \
    -v "$(pwd):/repo" \
    -w /repo \
    ghcr.io/gitleaks/gitleaks:v8.24.2 \
    detect --config "$CONFIG_PATH" --redact --verbose
fi

echo "gitleaks is not installed and Docker is unavailable." >&2
echo "Install gitleaks locally (https://github.com/gitleaks/gitleaks) or run in CI via .github/workflows/secret-scan.yml." >&2
exit 1
