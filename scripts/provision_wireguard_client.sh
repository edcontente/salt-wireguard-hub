#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <site_nome> [cliente_nome]"
  echo "Exemplo: $0 \"Everton Lima\" \"MacBook-Everton\""
  exit 1
fi

SITE_NAME="$1"
CLIENT_NAME="${2:-${SITE_NAME// /-}-client}"

# Defaults padronizados (ajuste se necessario por site)
WG_ENDPOINT="${WG_ENDPOINT:-191.248.70.82:51820}"
WG_SERVER_PUBLIC_KEY="${WG_SERVER_PUBLIC_KEY:-gTRnTOVSsNiFEnoufXk5dfT8vJoKtEko1S3s5P4+Ck8=}"
WG_CLIENT_IP="${WG_CLIENT_IP:-192.168.50.21/32}"
WG_CLIENT_IP="${WG_CLIENT_IP%%/*}/32"
WG_DNS="${WG_DNS:-192.168.16.1}"
WG_ALLOWED_IPS="${WG_ALLOWED_IPS:-0.0.0.0/0, ::/0}"
WG_MTU="${WG_MTU:-1280}"
WG_KEEPALIVE="${WG_KEEPALIVE:-25}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
WG_OUTPUT_BASE="${WG_OUTPUT_BASE:-/Users/edgardcontente/Resilio Sync/Salt - Operacional/Automação/Wireguard}"
OUT_DIR="$WG_OUTPUT_BASE/${SITE_NAME// /_}"
mkdir -p "$OUT_DIR"

# Gera chave X25519 compativel com WireGuard em base64
read -r WG_PRIVATE_KEY WG_PUBLIC_KEY < <(
  node -e "
const {generateKeyPairSync}=require('crypto');
const kp=generateKeyPairSync('x25519');
const pub=kp.publicKey.export({format:'jwk'});
const priv=kp.privateKey.export({format:'jwk'});
const toB64=(s)=>Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('base64');
console.log(toB64(priv.d)+' '+toB64(pub.x));
"
)

CONF_FILE="$OUT_DIR/${CLIENT_NAME}-${TIMESTAMP}.conf"
SUMMARY_FILE="$OUT_DIR/${CLIENT_NAME}-${TIMESTAMP}.txt"

cat > "$CONF_FILE" <<EOF
[Interface]
PrivateKey = $WG_PRIVATE_KEY
Address = $WG_CLIENT_IP
DNS = $WG_DNS
MTU = $WG_MTU

[Peer]
PublicKey = $WG_SERVER_PUBLIC_KEY
Endpoint = $WG_ENDPOINT
AllowedIPs = $WG_ALLOWED_IPS
PersistentKeepalive = $WG_KEEPALIVE
EOF

cat > "$SUMMARY_FILE" <<EOF
Site: $SITE_NAME
Cliente: $CLIENT_NAME

Preencher no Omada (Peer):
- Interface: Home
- Name: $CLIENT_NAME
- Public Key: $WG_PUBLIC_KEY
- Allow Address: $WG_CLIENT_IP
- Persistent Keepalive: $WG_KEEPALIVE
- Endpoint: (deixar vazio para cliente road-warrior)

Arquivo para importar no cliente:
$CONF_FILE
EOF

echo "OK: provisao WireGuard criada"
echo "CONF: $CONF_FILE"
echo "SUMMARY: $SUMMARY_FILE"

if command -v qrencode >/dev/null 2>&1; then
  QR_FILE="$OUT_DIR/${CLIENT_NAME}-${TIMESTAMP}.png"
  qrencode -o "$QR_FILE" < "$CONF_FILE"
  echo "QR: $QR_FILE"
fi
