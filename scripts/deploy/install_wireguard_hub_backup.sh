#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-192.168.1.253}"
DEPLOY_USER="${DEPLOY_USER:-salthub}"
DEPLOY_PASS="${DEPLOY_PASS:-}"
SUDO_PASS="${SUDO_PASS:-$DEPLOY_PASS}"
BACKUP_REMOTE_HOST="${BACKUP_REMOTE_HOST:-192.168.1.251}"
BACKUP_REMOTE_USER="${BACKUP_REMOTE_USER:-saltbackup}"
BACKUP_REMOTE_TARGET="${BACKUP_REMOTE_TARGET:-C:/Backups/salt-wireguard-hub}"
BACKUP_SSH_KEY_PATH="${BACKUP_SSH_KEY_PATH:-$HOME/.ssh/saltbackup_hub}"
BACKUP_REMOTE_KEY_PATH="${BACKUP_REMOTE_KEY_PATH:-/home/$DEPLOY_USER/.ssh/$(basename "$BACKUP_SSH_KEY_PATH")}"
BACKUP_ON_CALENDAR="${BACKUP_ON_CALENDAR:-*-*-* 03:30:00}"
BACKUP_RANDOM_DELAY="${BACKUP_RANDOM_DELAY:-15m}"
APP_DIR="${APP_DIR:-/opt/salt-wireguard-hub/current}"
SHARED_ENV="${SHARED_ENV:-/opt/salt-wireguard-hub/shared/.env}"
SERVICE_USER="${SERVICE_USER:-salthub}"
SERVICE_GROUP="${SERVICE_GROUP:-salthub}"

: "${DEPLOY_PASS:?DEPLOY_PASS é obrigatório}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cat > "$TMP_DIR/scp.exp" <<'EXP'
#!/usr/bin/expect -f
set timeout -1
set pass [lindex $argv 0]
set source [lindex $argv 1]
set dest [lindex $argv 2]
spawn scp -o StrictHostKeyChecking=accept-new $source $dest
expect {
  -re "password:" { send -- "$pass\r"; exp_continue }
  eof
}
EXP
chmod +x "$TMP_DIR/scp.exp"

cat > "$TMP_DIR/ssh.exp" <<'EXP'
#!/usr/bin/expect -f
set timeout -1
set pass [lindex $argv 0]
set host [lindex $argv 1]
set user [lindex $argv 2]
set cmd [lindex $argv 3]
spawn ssh -tt -o StrictHostKeyChecking=accept-new $user@$host $cmd
expect {
  -re "password:" { send -- "$pass\r"; exp_continue }
  eof
}
EXP
chmod +x "$TMP_DIR/ssh.exp"

SERVICE_FILE_OUT="$TMP_DIR/wireguard-hub-backup.service"
TIMER_FILE_OUT="$TMP_DIR/wireguard-hub-backup.timer"
bash "$ROOT_DIR/scripts/deploy/render_wireguard_hub_backup_service.sh" > "$SERVICE_FILE_OUT"
BACKUP_ON_CALENDAR="$BACKUP_ON_CALENDAR" \
BACKUP_RANDOM_DELAY="$BACKUP_RANDOM_DELAY" \
  bash "$ROOT_DIR/scripts/deploy/render_wireguard_hub_backup_timer.sh" > "$TIMER_FILE_OUT"

REMOTE_KEY_PATH="$BACKUP_REMOTE_KEY_PATH"
REMOTE_SERVICE_FILE="/tmp/wireguard-hub-backup.service"
REMOTE_TIMER_FILE="/tmp/wireguard-hub-backup.timer"

expect "$TMP_DIR/scp.exp" "$DEPLOY_PASS" "$ROOT_DIR/scripts/backup_wireguard_hub_runtime.sh" "$DEPLOY_USER@$DEPLOY_HOST:$APP_DIR/scripts/backup_wireguard_hub_runtime.sh"
if [[ -f "$BACKUP_SSH_KEY_PATH" ]]; then
  expect "$TMP_DIR/scp.exp" "$DEPLOY_PASS" "$BACKUP_SSH_KEY_PATH" "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_KEY_PATH"
fi
expect "$TMP_DIR/scp.exp" "$DEPLOY_PASS" "$SERVICE_FILE_OUT" "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_SERVICE_FILE"
expect "$TMP_DIR/scp.exp" "$DEPLOY_PASS" "$TIMER_FILE_OUT" "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_TIMER_FILE"

REMOTE_CMD=$(cat <<EOF
chmod 700 /home/$DEPLOY_USER/.ssh
chmod 600 $REMOTE_KEY_PATH
printf '%s\n' '$SUDO_PASS' | sudo -S install -m 755 $APP_DIR/scripts/backup_wireguard_hub_runtime.sh $APP_DIR/scripts/backup_wireguard_hub_runtime.sh
printf '%s\n' '$SUDO_PASS' | sudo -S install -m 644 $REMOTE_SERVICE_FILE /etc/systemd/system/wireguard-hub-backup.service
printf '%s\n' '$SUDO_PASS' | sudo -S install -m 644 $REMOTE_TIMER_FILE /etc/systemd/system/wireguard-hub-backup.timer
if ! grep -q '^BACKUP_REMOTE_HOST=' $SHARED_ENV; then echo 'BACKUP_REMOTE_HOST=$BACKUP_REMOTE_HOST' >> $SHARED_ENV; else sed -i \"s#^BACKUP_REMOTE_HOST=.*#BACKUP_REMOTE_HOST=$BACKUP_REMOTE_HOST#\" $SHARED_ENV; fi
if ! grep -q '^BACKUP_REMOTE_USER=' $SHARED_ENV; then echo 'BACKUP_REMOTE_USER=$BACKUP_REMOTE_USER' >> $SHARED_ENV; else sed -i \"s#^BACKUP_REMOTE_USER=.*#BACKUP_REMOTE_USER=$BACKUP_REMOTE_USER#\" $SHARED_ENV; fi
if ! grep -q '^BACKUP_REMOTE_TARGET=' $SHARED_ENV; then echo 'BACKUP_REMOTE_TARGET=$BACKUP_REMOTE_TARGET' >> $SHARED_ENV; else sed -i \"s#^BACKUP_REMOTE_TARGET=.*#BACKUP_REMOTE_TARGET=$BACKUP_REMOTE_TARGET#\" $SHARED_ENV; fi
if ! grep -q '^BACKUP_SSH_KEY=' $SHARED_ENV; then echo 'BACKUP_SSH_KEY=$REMOTE_KEY_PATH' >> $SHARED_ENV; else sed -i \"s#^BACKUP_SSH_KEY=.*#BACKUP_SSH_KEY=$REMOTE_KEY_PATH#\" $SHARED_ENV; fi
printf '%s\n' '$SUDO_PASS' | sudo -S systemctl daemon-reload
printf '%s\n' '$SUDO_PASS' | sudo -S systemctl enable --now wireguard-hub-backup.timer
printf '%s\n' '$SUDO_PASS' | sudo -S systemctl restart wireguard-hub-backup.timer
printf '%s\n' '$SUDO_PASS' | sudo -S systemctl start wireguard-hub-backup.service
printf '%s\n' '$SUDO_PASS' | sudo -S systemctl --no-pager --full status wireguard-hub-backup.timer
EOF
)

expect "$TMP_DIR/ssh.exp" "$DEPLOY_PASS" "$DEPLOY_HOST" "$DEPLOY_USER" "$REMOTE_CMD"

echo
printf 'Backup do hub configurado em %s@%s\n' "$BACKUP_REMOTE_USER" "$BACKUP_REMOTE_HOST"
printf 'Destino remoto: %s\n' "$BACKUP_REMOTE_TARGET"
