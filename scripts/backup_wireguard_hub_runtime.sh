#!/usr/bin/env bash
set -euo pipefail

BACKUP_SOURCE_SHARED_DIR="${BACKUP_SOURCE_SHARED_DIR:-/opt/salt-wireguard-hub/shared}"
BACKUP_SOURCE_CADDY_FILE="${BACKUP_SOURCE_CADDY_FILE:-/etc/caddy/Caddyfile}"
BACKUP_SOURCE_SERVICE_FILE="${BACKUP_SOURCE_SERVICE_FILE:-/etc/systemd/system/wireguard-dashboard.service}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/opt/salt-wireguard-hub/shared/backups}"
BACKUP_REMOTE_HOST="${BACKUP_REMOTE_HOST:-}"
BACKUP_REMOTE_USER="${BACKUP_REMOTE_USER:-}"
BACKUP_REMOTE_TARGET="${BACKUP_REMOTE_TARGET:-}"
BACKUP_SSH_KEY="${BACKUP_SSH_KEY:-$HOME/.ssh/saltbackup_hub}"
BACKUP_DRY_RUN="${BACKUP_DRY_RUN:-0}"
BACKUP_TIMESTAMP="${BACKUP_TIMESTAMP:-$(date +%Y%m%d-%H%M%S)}"
BACKUP_SOURCE_RELEASES_DIR="${BACKUP_SOURCE_RELEASES_DIR:-}"
BACKUP_INCLUDE_RELEASES="${BACKUP_INCLUDE_RELEASES:-0}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$BACKUP_LOCAL_DIR"

STAGE_DIR="$TMP_DIR/stage"
ARCHIVE_BASENAME="wireguard-hub-backup-$BACKUP_TIMESTAMP"
ARCHIVE_FILE="$BACKUP_LOCAL_DIR/$ARCHIVE_BASENAME.tar.gz"
MANIFEST_FILE="$BACKUP_LOCAL_DIR/$ARCHIVE_BASENAME.manifest.txt"

mkdir -p \
  "$STAGE_DIR/opt/salt-wireguard-hub" \
  "$STAGE_DIR/etc/caddy" \
  "$STAGE_DIR/etc/systemd/system"

cp -a "$BACKUP_SOURCE_SHARED_DIR" "$STAGE_DIR/opt/salt-wireguard-hub/shared"
cp -a "$BACKUP_SOURCE_CADDY_FILE" "$STAGE_DIR/etc/caddy/Caddyfile"
cp -a "$BACKUP_SOURCE_SERVICE_FILE" "$STAGE_DIR/etc/systemd/system/wireguard-dashboard.service"
if [[ "$BACKUP_INCLUDE_RELEASES" == "1" && -n "$BACKUP_SOURCE_RELEASES_DIR" && -d "$BACKUP_SOURCE_RELEASES_DIR" ]]; then
  cp -a "$BACKUP_SOURCE_RELEASES_DIR" "$STAGE_DIR/opt/salt-wireguard-hub/releases"
fi

{
  echo "timestamp=$BACKUP_TIMESTAMP"
  echo "hostname=$(hostname)"
  echo "shared=$BACKUP_SOURCE_SHARED_DIR"
  echo "caddy=$BACKUP_SOURCE_CADDY_FILE"
  echo "service=$BACKUP_SOURCE_SERVICE_FILE"
  echo "include_releases=$BACKUP_INCLUDE_RELEASES"
  if [[ "$BACKUP_INCLUDE_RELEASES" == "1" && -n "$BACKUP_SOURCE_RELEASES_DIR" ]]; then
    echo "releases=$BACKUP_SOURCE_RELEASES_DIR"
  fi
  if [[ -n "$BACKUP_REMOTE_HOST" && -n "$BACKUP_REMOTE_USER" && -n "$BACKUP_REMOTE_TARGET" ]]; then
    echo "remote=$BACKUP_REMOTE_USER@$BACKUP_REMOTE_HOST:$BACKUP_REMOTE_TARGET"
  fi
} > "$MANIFEST_FILE"

tar -C "$STAGE_DIR" -czf "$ARCHIVE_FILE" .

echo "BACKUP_READY $ARCHIVE_FILE"
echo "BACKUP_MANIFEST $MANIFEST_FILE"

if [[ -n "$BACKUP_REMOTE_HOST" && -n "$BACKUP_REMOTE_USER" && -n "$BACKUP_REMOTE_TARGET" ]]; then
  REMOTE_DEST="$BACKUP_REMOTE_USER@$BACKUP_REMOTE_HOST:$BACKUP_REMOTE_TARGET/"
  if [[ "$BACKUP_DRY_RUN" == "1" ]]; then
    echo "BACKUP_REMOTE_SKIPPED $REMOTE_DEST"
  else
    scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i "$BACKUP_SSH_KEY" \
      "$ARCHIVE_FILE" "$MANIFEST_FILE" "$REMOTE_DEST"
    echo "BACKUP_REMOTE_OK $REMOTE_DEST"
  fi
fi
