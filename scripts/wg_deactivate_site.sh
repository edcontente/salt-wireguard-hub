#!/usr/bin/env bash
set -euo pipefail

# Hook opcional para integração real (pfSense/Node-RED/SSH).
# Variáveis esperadas:
# - SITE_ID
# - SITE_NAME
# - TECHNICIAN

echo "Hook deactivate (stub)"
echo "SITE_ID=${SITE_ID:-}"
echo "SITE_NAME=${SITE_NAME:-}"
echo "TECHNICIAN=${TECHNICIAN:-}"
