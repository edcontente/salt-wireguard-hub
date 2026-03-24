#!/usr/bin/env bash
set -euo pipefail

BACKUP_ON_CALENDAR="${BACKUP_ON_CALENDAR:-*-*-* 03:30:00}"
BACKUP_RANDOM_DELAY="${BACKUP_RANDOM_DELAY:-15m}"

cat <<EOF
[Unit]
Description=Run Salt WireGuard Hub Backup daily

[Timer]
OnCalendar=$BACKUP_ON_CALENDAR
RandomizedDelaySec=$BACKUP_RANDOM_DELAY
Persistent=true
Unit=wireguard-hub-backup.service

[Install]
WantedBy=timers.target
EOF
