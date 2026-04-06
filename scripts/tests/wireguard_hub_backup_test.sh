#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

SCRIPT="$ROOT_DIR/scripts/backup_wireguard_hub_runtime.sh"
SERVICE_RENDER="$ROOT_DIR/scripts/deploy/render_wireguard_hub_backup_service.sh"
TIMER_RENDER="$ROOT_DIR/scripts/deploy/render_wireguard_hub_backup_timer.sh"
INSTALLER="$ROOT_DIR/scripts/deploy/install_wireguard_hub_backup.sh"

[[ -x "$SCRIPT" ]] || fail "script de backup não existe ou não é executável"
[[ -x "$SERVICE_RENDER" ]] || fail "render da service não existe ou não é executável"
[[ -x "$TIMER_RENDER" ]] || fail "render do timer não existe ou não é executável"
[[ -x "$INSTALLER" ]] || fail "instalador de backup não existe ou não é executável"

SRC_SHARED="$TMP_DIR/shared"
SRC_CADDY="$TMP_DIR/Caddyfile"
SRC_SERVICE="$TMP_DIR/wireguard-dashboard.service"
LOCAL_OUT="$TMP_DIR/out"
mkdir -p "$SRC_SHARED/data"
echo 'dash-data' > "$SRC_SHARED/data/example.txt"
echo 'caddy' > "$SRC_CADDY"
echo 'service' > "$SRC_SERVICE"

BACKUP_SOURCE_SHARED_DIR="$SRC_SHARED" \
BACKUP_SOURCE_CADDY_FILE="$SRC_CADDY" \
BACKUP_SOURCE_SERVICE_FILE="$SRC_SERVICE" \
BACKUP_LOCAL_DIR="$LOCAL_OUT" \
BACKUP_REMOTE_HOST="192.168.1.251" \
BACKUP_REMOTE_USER="saltbackup" \
BACKUP_REMOTE_TARGET='C:/Backups/salt-wireguard-hub' \
BACKUP_DRY_RUN="1" \
  bash "$SCRIPT" > "$TMP_DIR/run.log"

ARCHIVE_COUNT="$(find "$LOCAL_OUT" -maxdepth 1 -type f -name 'wireguard-hub-backup-*.tar.gz' | wc -l | tr -d ' ')"
[[ "$ARCHIVE_COUNT" == "1" ]] || fail "backup versionado não foi gerado"

MANIFEST_COUNT="$(find "$LOCAL_OUT" -maxdepth 1 -type f -name 'wireguard-hub-backup-*.manifest.txt' | wc -l | tr -d ' ')"
[[ "$MANIFEST_COUNT" == "1" ]] || fail "manifesto do backup não foi gerado"

LOG_FILE="$TMP_DIR/run.log"
grep -Fq 'C:/Backups/salt-wireguard-hub' "$LOG_FILE" || fail "destino remoto do backup não apareceu no log"
grep -Fq 'BACKUP_READY' "$LOG_FILE" || fail "script não sinalizou backup pronto"
grep -Fq 'BACKUP_REMOTE_SKIPPED' "$LOG_FILE" || fail "script não indicou dry-run do envio remoto"

SERVICE_OUT="$TMP_DIR/wireguard-hub-backup.service"
TIMER_OUT="$TMP_DIR/wireguard-hub-backup.timer"
bash "$SERVICE_RENDER" > "$SERVICE_OUT"
bash "$TIMER_RENDER" > "$TIMER_OUT"

grep -Fq 'ExecStart=/usr/bin/env bash /opt/salt-wireguard-hub/current/scripts/backup_wireguard_hub_runtime.sh' "$SERVICE_OUT" || fail 'ExecStart do backup ausente na unit'
grep -Fq 'User=salthub' "$SERVICE_OUT" || fail 'User da unit de backup incorreto'
grep -Fq 'OnCalendar=*-*-* 03:30:00' "$TIMER_OUT" || fail 'agenda padrão do timer ausente'
grep -Fq 'RandomizedDelaySec=15m' "$TIMER_OUT" || fail 'randomização do timer ausente'
grep -Fq 'BACKUP_REMOTE_KEY_PATH="${BACKUP_REMOTE_KEY_PATH:-/home/$DEPLOY_USER/.ssh/' "$INSTALLER" || fail 'fallback de chave remota ausente no instalador'
grep -Fq 'if [[ -f "$BACKUP_SSH_KEY_PATH" ]]; then' "$INSTALLER" || fail 'instalador não trata chave local opcional'

echo 'ok'
