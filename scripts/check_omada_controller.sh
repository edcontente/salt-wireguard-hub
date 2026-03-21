#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <omada-base-url>"
  echo "Example: $0 https://omada.saltengenharia.com.br:8043"
  exit 1
fi

URL="$1"

echo "Checking controller URL: $URL"
HTTP_STATUS="$(curl -k -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")"

if [[ "$HTTP_STATUS" =~ ^2|3 ]]; then
  echo "OK: controller reachable (HTTP $HTTP_STATUS)"
  exit 0
fi

echo "ERROR: controller not reachable or unexpected status (HTTP $HTTP_STATUS)"
exit 2
