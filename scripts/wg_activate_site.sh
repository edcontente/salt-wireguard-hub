#!/usr/bin/env bash
set -euo pipefail

# Hook opcional para integração real (pfSense/Node-RED/SSH).
# Variáveis esperadas:
# - SITE_ID
# - SITE_NAME
# - TECHNICIAN
# - TTL_HOURS
# - ACTIVATED_AT
# - EXPIRES_AT

echo "Hook activate (stub)"
echo "SITE_ID=${SITE_ID:-}"
echo "SITE_NAME=${SITE_NAME:-}"
echo "TECHNICIAN=${TECHNICIAN:-}"
echo "TTL_HOURS=${TTL_HOURS:-}"
echo "ACTIVATED_AT=${ACTIVATED_AT:-}"
echo "EXPIRES_AT=${EXPIRES_AT:-}"
