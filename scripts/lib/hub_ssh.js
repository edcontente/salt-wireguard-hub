const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

function bashSingleQuote(value) {
  return `'${String(value || '').replace(/'/g, `'"'"'`)}'`;
}

function runExecFile(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 20 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function ensureExpectHelpers(baseDir) {
  const sshExpect = path.join(baseDir, 'hub_ssh.exp');
  const scpExpect = path.join(baseDir, 'hub_scp.exp');

  if (!fs.existsSync(sshExpect)) {
    fs.writeFileSync(sshExpect, `#!/usr/bin/expect -f
set timeout 180
set pass [lindex $argv 0]
set host [lindex $argv 1]
set user [lindex $argv 2]
set remote_cmd [lindex $argv 3]
spawn ssh -tt -o StrictHostKeyChecking=accept-new $user@$host $remote_cmd
expect {
  "*yes/no*" {send -- "yes\\r"; exp_continue}
  "*password*" {send -- "$pass\\r"; exp_continue}
  eof
}
set waitval [wait]
set exit_status [lindex $waitval 3]
exit $exit_status
`);
    fs.chmodSync(sshExpect, 0o755);
  }

  if (!fs.existsSync(scpExpect)) {
    fs.writeFileSync(scpExpect, `#!/usr/bin/expect -f
set timeout 180
set pass [lindex $argv 0]
set source [lindex $argv 1]
set dest [lindex $argv 2]
spawn scp -o StrictHostKeyChecking=accept-new $source $dest
expect {
  "*yes/no*" {send -- "yes\\r"; exp_continue}
  "*password*" {send -- "$pass\\r"; exp_continue}
  eof
}
set waitval [wait]
set exit_status [lindex $waitval 3]
exit $exit_status
`);
    fs.chmodSync(scpExpect, 0o755);
  }

  return { sshExpect, scpExpect };
}

function cleanExpectNoise(output) {
  return String(output || '')
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('spawn ssh ')) return false;
      if (trimmed.startsWith('spawn scp ')) return false;
      if (trimmed.includes("'s password:")) return false;
      if (trimmed.startsWith('[sudo] password for ')) return false;
      if (trimmed.startsWith('Connection to ')) return false;
      return true;
    })
    .join('\n')
    .trim();
}

function extractJsonObject(output) {
  const clean = String(output || '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return {};
  return JSON.parse(clean.slice(start, end + 1));
}

async function uploadAndRunRemoteScript(hub, scriptContent, remoteBaseName) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-hub-'));
  const remoteName = String(remoteBaseName || 'codex-hub-script').replace(/[^a-z0-9_-]+/gi, '-');
  const localScript = path.join(workDir, `${remoteName}.sh`);
  const remoteScript = `/tmp/${remoteName}.sh`;
  const { sshExpect, scpExpect } = ensureExpectHelpers(workDir);

  fs.writeFileSync(localScript, scriptContent);
  fs.chmodSync(localScript, 0o755);

  try {
    await runExecFile(scpExpect, [hub.pass, localScript, `${hub.user}@${hub.host}:${remoteScript}`]);
    const { stdout, stderr } = await runExecFile(sshExpect, [hub.pass, hub.host, hub.user, `chmod +x ${remoteScript} && bash ${remoteScript}`]);
    return { stdout, stderr };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function readHubWgShow(hub) {
  const iface = hub.wgInterface || 'wg0';
  const script = `#!/usr/bin/env bash
set -euo pipefail
PASS=${bashSingleQuote(hub.pass)}
printf '%s\\n' "$PASS" | sudo -S wg show ${iface}
`;
  const result = await uploadAndRunRemoteScript(hub, script, 'codex-read-wg-show');
  return cleanExpectNoise(result.stdout);
}

async function generateWireGuardKeypair(hub) {
  const script = `#!/usr/bin/env bash
set -euo pipefail
priv=$(wg genkey)
pub=$(printf '%s' "$priv" | wg pubkey)
printf '{"privateKey":"%s","publicKey":"%s"}\\n' "$priv" "$pub"
`;
  const result = await uploadAndRunRemoteScript(hub, script, 'codex-generate-keypair');
  return extractJsonObject(result.stdout);
}

async function ensureHubPeer(hub, peer) {
  const iface = hub.wgInterface || 'wg0';
  const keepalive = Number(peer.keepalive || 25);
  const marker = String(peer.marker || 'dashboard-peer').replace(/[^a-z0-9:_-]+/gi, '-');
  const markerStart = `# codex-dashboard:start:${marker}`;
  const markerEnd = `# codex-dashboard:end:${marker}`;
  const block = [
    markerStart,
    '[Peer]',
    `PublicKey = ${peer.publicKey}`,
    `AllowedIPs = ${peer.allowedIp}`,
    `PersistentKeepalive = ${keepalive}`,
    markerEnd,
    '',
  ].join('\n');

  const script = `#!/usr/bin/env bash
set -euo pipefail
PASS=${bashSingleQuote(hub.pass)}
CONFIG_FILE=/etc/wireguard/${iface}.conf
MARKER_START=${bashSingleQuote(markerStart)}
MARKER_END=${bashSingleQuote(markerEnd)}
PUBLIC_KEY=${bashSingleQuote(peer.publicKey)}
ALLOWED_IP=${bashSingleQuote(peer.allowedIp)}
KEEPALIVE=${bashSingleQuote(String(keepalive))}
BLOCK=${bashSingleQuote(block)}
printf '%s\\n' "$PASS" | sudo -S cp -f "$CONFIG_FILE" "/tmp/${iface}.conf.pre-codex-dashboard"
printf '%s\\n' "$PASS" | sudo -S python3 - <<'PY' "$CONFIG_FILE" "$MARKER_START" "$MARKER_END" "$BLOCK"
from pathlib import Path
import sys
config_path = Path(sys.argv[1])
marker_start = sys.argv[2]
marker_end = sys.argv[3]
block = sys.argv[4]
text = config_path.read_text()
start = text.find(marker_start)
end = text.find(marker_end)
if start != -1 and end != -1 and end >= start:
    end = text.find('\\n', end)
    if end == -1:
        end = len(text)
    else:
        end += 1
    text = text[:start] + block + text[end:]
else:
    if text and not text.endswith('\\n'):
        text += '\\n'
    text += '\\n' + block
config_path.write_text(text)
PY
printf '%s\\n' "$PASS" | sudo -S wg set ${iface} peer "$PUBLIC_KEY" allowed-ips "$ALLOWED_IP" persistent-keepalive "$KEEPALIVE"
printf '%s\\n' "$PASS" | sudo -S wg show ${iface}
`;

  return uploadAndRunRemoteScript(hub, script, `codex-ensure-peer-${marker}`);
}

module.exports = {
  readHubWgShow,
  generateWireGuardKeypair,
  ensureHubPeer,
};
