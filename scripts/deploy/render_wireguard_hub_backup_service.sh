#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/salt-wireguard-hub/current}"
SERVICE_USER="${SERVICE_USER:-salthub}"
SERVICE_GROUP="${SERVICE_GROUP:-salthub}"
SHARED_ENV="${SHARED_ENV:-/opt/salt-wireguard-hub/shared/.env}"

cat <<EOF
[Unit]
Description=Salt WireGuard Hub Backup
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$SERVICE_USER
Group=$SERVICE_GROUP
EnvironmentFile=$SHARED_ENV
ExecStart=/usr/bin/env bash $APP_DIR/scripts/backup_wireguard_hub_runtime.sh

[Install]
WantedBy=multi-user.target
EOF
