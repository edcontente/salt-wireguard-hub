#!/usr/bin/env bash
set -uo pipefail

if [[ $# -lt 2 ]]; then
  echo "Uso: $0 <site_nome> <cliente_nome>"
  exit 1
fi

: "${OMADA_URL:?OMADA_URL é obrigatório}"
: "${OMADA_USERNAME:?OMADA_USERNAME é obrigatório}"
: "${OMADA_PASSWORD:?OMADA_PASSWORD é obrigatório}"
: "${OMADA_SITE_ID:?OMADA_SITE_ID é obrigatório}"

SITE_NAME="$1"
CLIENT_NAME="$2"

OMADA_CONTROLLER_ID="${OMADA_CONTROLLER_ID:-}"
WG_INTERFACE_NAME="${WG_INTERFACE_NAME:-Home}"
WG_INTERFACE_LOCAL_IP="${WG_INTERFACE_LOCAL_IP:-192.168.50.10}"
WG_INTERFACE_LISTEN_PORT="${WG_INTERFACE_LISTEN_PORT:-51820}"
WG_INTERFACE_MTU="${WG_INTERFACE_MTU:-1280}"
WG_INTERFACE_PRIVATE_KEY="${WG_INTERFACE_PRIVATE_KEY:-}"

WG_ENDPOINT="${WG_ENDPOINT:-191.248.70.82:51820}"
WG_DNS="${WG_DNS:-192.168.16.1}"
WG_ALLOWED_IPS="${WG_ALLOWED_IPS:-0.0.0.0/0, ::/0}"
WG_KEEPALIVE="${WG_KEEPALIVE:-25}"
WG_CLIENT_IP="${WG_CLIENT_IP:-192.168.50.21/32}"
WG_CLIENT_IP="${WG_CLIENT_IP%%/*}/32"

BASE_URL="${OMADA_URL%/}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
COOKIE_JAR="$TMP_DIR/cookies.txt"
CSRF_TOKEN=""
API_PREFIX=""
HTTP_CODE=""
BODY=""

http_json() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local out_body="$TMP_DIR/body.json"
  local out_code="$TMP_DIR/code.txt"
  local curl_rc=0

  if [[ -n "$data" ]]; then
    curl -k -sS -X "$method" "$url" \
      -H 'Content-Type: application/json' \
      -H "Csrf-Token: ${CSRF_TOKEN:-}" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      --data "$data" \
      -o "$out_body" -w '%{http_code}' > "$out_code" || curl_rc=$?
  else
    curl -k -sS -X "$method" "$url" \
      -H "Csrf-Token: ${CSRF_TOKEN:-}" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -o "$out_body" -w '%{http_code}' > "$out_code" || curl_rc=$?
  fi

  if [[ "$curl_rc" -ne 0 ]]; then
    HTTP_CODE="000"
    BODY=""
    return 0
  fi

  HTTP_CODE="$(cat "$out_code" 2>/dev/null || echo 000)"
  BODY="$(cat "$out_body" 2>/dev/null || true)"
}

extract_error_code() {
  node -e 'try{const o=JSON.parse(process.argv[1]||"{}");const e=o?.errorCode;process.stdout.write(e===undefined?"":String(e))}catch{process.stdout.write("")}' "$1"
}

extract_msg() {
  node -e 'try{const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o?.msg||""))}catch{process.stdout.write("")}' "$1"
}

extract_token() {
  node -e 'try{const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o?.result?.token||""))}catch{process.stdout.write("")}' "$1"
}

extract_controller_id() {
  node -e 'try{const o=JSON.parse(process.argv[1]||"{}");const r=o?.result||{};process.stdout.write(String(r.omadacId||r.controllerId||""))}catch{process.stdout.write("")}' "$1"
}

extract_interface_info_by_name() {
  node -e '
  const raw = process.argv[1] || "{}";
  const wanted = String(process.argv[2] || "");
  let o = {};
  try { o = JSON.parse(raw); } catch {}
  const rows = Array.isArray(o?.result?.data) ? o.result.data : [];
  const norm = (x) => String(x || "").trim().toLowerCase();
  const pick = rows.find((r) => norm(r.name || r.interfaceName || r.wireguardName) === norm(wanted));
  if (!pick) process.exit(0);
  const out = {
    id: String(pick.id || pick.interfaceId || pick.wireguardId || pick._id || ""),
    name: String(pick.name || pick.interfaceName || pick.wireguardName || ""),
    publicKey: String(pick.publicKey || pick.pubKey || pick.serverPublicKey || ""),
  };
  process.stdout.write(JSON.stringify(out));
  ' "$1" "$2"
}

peer_exists() {
  node -e '
  const raw = process.argv[1] || "{}";
  const wantedName = String(process.argv[2] || "").trim().toLowerCase();
  const wantedPub = String(process.argv[3] || "").trim();
  let o = {};
  try { o = JSON.parse(raw); } catch {}
  const rows = Array.isArray(o?.result?.data) ? o.result.data : [];
  const yes = rows.some((r) => {
    const n = String(r.name || r.peerName || "").trim().toLowerCase();
    const p = String(r.publicKey || r.pubKey || "").trim();
    return (wantedName && n === wantedName) || (wantedPub && p === wantedPub);
  });
  process.stdout.write(yes ? "true" : "false");
  ' "$1" "$2" "$3"
}

build_prefixes() {
  local list=("")
  if [[ -n "$OMADA_CONTROLLER_ID" ]]; then
    list=("/$OMADA_CONTROLLER_ID" "")
  fi
  printf '%s\n' "${list[@]}"
}

gen_wg_pair() {
  node -e "
const {generateKeyPairSync}=require('crypto');
const kp=generateKeyPairSync('x25519');
const pub=kp.publicKey.export({format:'jwk'});
const priv=kp.privateKey.export({format:'jwk'});
const toB64=(s)=>Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('base64');
console.log(toB64(priv.d)+' '+toB64(pub.x));
"
}

if [[ -z "$WG_INTERFACE_PRIVATE_KEY" ]]; then
  WG_INTERFACE_PRIVATE_KEY="$(openssl rand -base64 32 | tr -d '\r\n')"
fi

read -r WG_CLIENT_PRIVATE_KEY WG_CLIENT_PUBLIC_KEY < <(gen_wg_pair)

LOGIN_PAYLOAD="{\"username\":\"$OMADA_USERNAME\",\"password\":\"$OMADA_PASSWORD\"}"
while IFS= read -r prefix; do
  http_json POST "$BASE_URL${prefix}/api/v2/login" "$LOGIN_PAYLOAD"
  err="$(extract_error_code "$BODY")"
  tok="$(extract_token "$BODY")"
  cid="$(extract_controller_id "$BODY")"
  if [[ "$HTTP_CODE" == "200" && "$err" == "0" && -n "$tok" ]]; then
    API_PREFIX="$prefix"
    CSRF_TOKEN="$tok"
    [[ -z "$OMADA_CONTROLLER_ID" && -n "$cid" ]] && OMADA_CONTROLLER_ID="$cid"
    break
  fi
done < <(build_prefixes)

if [[ -z "$CSRF_TOKEN" ]]; then
  echo "ERRO: login falhou"
  exit 2
fi
if [[ -n "$OMADA_CONTROLLER_ID" && -z "$API_PREFIX" ]]; then
  API_PREFIX="/$OMADA_CONTROLLER_ID"
fi

echo "Login OK: $BASE_URL$API_PREFIX/api/v2/login"
echo "Controller: ${OMADA_CONTROLLER_ID:-N/A}"

http_json POST "$BASE_URL$API_PREFIX/api/v2/sites/$OMADA_SITE_ID/cmd/switch"
SW_ERR="$(extract_error_code "$BODY")"
if [[ "$HTTP_CODE" != "200" || "$SW_ERR" != "0" ]]; then
  echo "ERRO: switch site falhou (HTTP $HTTP_CODE errorCode ${SW_ERR:-N/A})"
  exit 3
fi
echo "Switch site: HTTP $HTTP_CODE errorCode $SW_ERR"
echo "Port-forward Omada API: não identificado neste controller (endpoints NAT retornam -1600)."
echo "Nota: para WireGuard no ER605, normalmente não há port-forward interno; só encaminhe UDP $WG_INTERFACE_LISTEN_PORT no modem/roteador upstream (se houver duplo NAT)."

IF_EP="/api/v2/sites/$OMADA_SITE_ID/setting/wireguard"
PEER_EP="/api/v2/sites/$OMADA_SITE_ID/setting/wireguard/peer"
PEERS_EP="/api/v2/sites/$OMADA_SITE_ID/setting/wireguard/peers"

http_json GET "$BASE_URL$API_PREFIX$IF_EP"
IF_ERR="$(extract_error_code "$BODY")"
if [[ "$HTTP_CODE" != "200" || "$IF_ERR" != "0" ]]; then
  echo "ERRO: GET interface falhou (HTTP $HTTP_CODE errorCode ${IF_ERR:-N/A})"
  exit 4
fi

IF_JSON="$(extract_interface_info_by_name "$BODY" "$WG_INTERFACE_NAME")"
IF_CREATED="false"
if [[ -z "$IF_JSON" ]]; then
  echo "Interface '$WG_INTERFACE_NAME' não encontrada. Criando..."
  IF_CREATED="true"
  IF_PAYLOADS=(
    "{\"name\":\"$WG_INTERFACE_NAME\",\"enable\":true,\"mtu\":$WG_INTERFACE_MTU,\"listenPort\":$WG_INTERFACE_LISTEN_PORT,\"localIpAddress\":\"$WG_INTERFACE_LOCAL_IP\",\"privateKey\":\"$WG_INTERFACE_PRIVATE_KEY\"}"
    "{\"name\":\"$WG_INTERFACE_NAME\",\"status\":true,\"mtu\":$WG_INTERFACE_MTU,\"port\":$WG_INTERFACE_LISTEN_PORT,\"localIp\":\"$WG_INTERFACE_LOCAL_IP\",\"privateKey\":\"$WG_INTERFACE_PRIVATE_KEY\"}"
    "{\"interfaceName\":\"$WG_INTERFACE_NAME\",\"enabled\":true,\"mtu\":$WG_INTERFACE_MTU,\"listenPort\":$WG_INTERFACE_LISTEN_PORT,\"address\":\"$WG_INTERFACE_LOCAL_IP\",\"privateKey\":\"$WG_INTERFACE_PRIVATE_KEY\"}"
    "{\"name\":\"$WG_INTERFACE_NAME\",\"interfaceName\":\"$WG_INTERFACE_NAME\",\"enable\":true,\"enabled\":true,\"status\":true,\"mtu\":$WG_INTERFACE_MTU,\"listenPort\":$WG_INTERFACE_LISTEN_PORT,\"port\":$WG_INTERFACE_LISTEN_PORT,\"localIpAddress\":\"$WG_INTERFACE_LOCAL_IP\",\"localIp\":\"$WG_INTERFACE_LOCAL_IP\",\"address\":\"$WG_INTERFACE_LOCAL_IP\",\"privateKey\":\"$WG_INTERFACE_PRIVATE_KEY\"}"
  )
  CREATE_OK="false"
  for payload in "${IF_PAYLOADS[@]}"; do
    http_json POST "$BASE_URL$API_PREFIX$IF_EP" "$payload"
    ec="$(extract_error_code "$BODY")"
    msg="$(extract_msg "$BODY" | tr '\n' ' ')"
    echo "IF POST => HTTP $HTTP_CODE errorCode ${ec:-N/A} msg: ${msg:-N/A}"
    if [[ "$HTTP_CODE" == "200" && "$ec" == "0" ]]; then
      CREATE_OK="true"
      break
    fi
  done
  if [[ "$CREATE_OK" != "true" ]]; then
    echo "ERRO: não foi possível criar interface WireGuard."
    exit 5
  fi

  http_json GET "$BASE_URL$API_PREFIX$IF_EP"
  IF_JSON="$(extract_interface_info_by_name "$BODY" "$WG_INTERFACE_NAME")"
fi

if [[ -z "$IF_JSON" ]]; then
  echo "ERRO: interface criada/esperada, mas não encontrada no GET."
  exit 6
fi

WG_SERVER_PUBLIC_KEY="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.publicKey||""))' "$IF_JSON")"
IF_ID="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.id||""))' "$IF_JSON")"

if [[ -z "$WG_SERVER_PUBLIC_KEY" ]]; then
  echo "ERRO: publicKey da interface não retornou. Não dá para montar .conf."
  exit 7
fi

http_json GET "$BASE_URL$API_PREFIX$PEER_EP"
PEER_ERR="$(extract_error_code "$BODY")"
if [[ "$HTTP_CODE" == "200" && "$PEER_ERR" == "0" ]]; then
  if [[ "$(peer_exists "$BODY" "$CLIENT_NAME" "$WG_CLIENT_PUBLIC_KEY")" == "true" ]]; then
    echo "Peer já existe para este cliente/chave. Não será recriado."
    PEER_CREATED="false"
  else
    PEER_CREATED="true"
  fi
else
  PEER_CREATED="true"
fi

if [[ "$PEER_CREATED" == "true" ]]; then
  echo "Criando peer '$CLIENT_NAME'..."
  FULL_PEER_JSON="{\"name\":\"$CLIENT_NAME\",\"status\":true,\"enable\":true,\"interfaceId\":\"$IF_ID\",\"wireguardId\":\"$IF_ID\",\"interface\":\"$WG_INTERFACE_NAME\",\"interfaceName\":\"$WG_INTERFACE_NAME\",\"wireguardName\":\"$WG_INTERFACE_NAME\",\"allowedAddress\":\"$WG_CLIENT_IP\",\"allowAddress\":\"$WG_CLIENT_IP\",\"allowedIp\":\"$WG_CLIENT_IP\",\"allowedIps\":[\"$WG_CLIENT_IP\"],\"publicKey\":\"$WG_CLIENT_PUBLIC_KEY\",\"persistentKeepalive\":$WG_KEEPALIVE,\"keepalive\":$WG_KEEPALIVE,\"endpoint\":\"\",\"endpointPort\":\"\",\"presharedKey\":\"\",\"comment\":\"auto\"}"
  PEER_PAYLOADS=(
    "{\"name\":\"$CLIENT_NAME\",\"interface\":\"$WG_INTERFACE_NAME\",\"allowedAddress\":\"$WG_CLIENT_IP\",\"publicKey\":\"$WG_CLIENT_PUBLIC_KEY\",\"persistentKeepalive\":$WG_KEEPALIVE}"
    "{\"name\":\"$CLIENT_NAME\",\"interfaceName\":\"$WG_INTERFACE_NAME\",\"allowAddress\":\"$WG_CLIENT_IP\",\"publicKey\":\"$WG_CLIENT_PUBLIC_KEY\",\"keepalive\":$WG_KEEPALIVE}"
    "{\"name\":\"$CLIENT_NAME\",\"wireguardName\":\"$WG_INTERFACE_NAME\",\"allowedAddress\":\"$WG_CLIENT_IP\",\"allowAddress\":\"$WG_CLIENT_IP\",\"allowedIps\":[\"$WG_CLIENT_IP\"],\"publicKey\":\"$WG_CLIENT_PUBLIC_KEY\",\"persistentKeepalive\":$WG_KEEPALIVE}"
    "$FULL_PEER_JSON"
  )
  if [[ -n "$IF_ID" ]]; then
    PEER_PAYLOADS+=("{\"name\":\"$CLIENT_NAME\",\"interfaceId\":\"$IF_ID\",\"allowedAddress\":\"$WG_CLIENT_IP\",\"publicKey\":\"$WG_CLIENT_PUBLIC_KEY\",\"persistentKeepalive\":$WG_KEEPALIVE}")
  fi

  P_OK="false"
  for payload in "${PEER_PAYLOADS[@]}"; do
    http_json POST "$BASE_URL$API_PREFIX$PEER_EP" "$payload"
    ec="$(extract_error_code "$BODY")"
    msg="$(extract_msg "$BODY" | tr '\n' ' ')"
    echo "PEER POST => HTTP $HTTP_CODE errorCode ${ec:-N/A} msg: ${msg:-N/A}"
    if [[ "$HTTP_CODE" == "200" && "$ec" == "0" ]]; then
      P_OK="true"
      break
    fi
  done
  if [[ "$P_OK" != "true" ]]; then
    # Alguns controladores aceitam atualização em lote via PUT /peers.
    BULK_PAYLOADS=(
      "$FULL_PEER_JSON"
      "{\"data\":[$FULL_PEER_JSON]}"
      "[$FULL_PEER_JSON]"
    )
    for payload in "${BULK_PAYLOADS[@]}"; do
      http_json PUT "$BASE_URL$API_PREFIX$PEERS_EP" "$payload"
      ec="$(extract_error_code "$BODY")"
      msg="$(extract_msg "$BODY" | tr '\n' ' ')"
      echo "PEERS PUT => HTTP $HTTP_CODE errorCode ${ec:-N/A} msg: ${msg:-N/A}"
      if [[ "$HTTP_CODE" == "200" && "$ec" == "0" ]]; then
        P_OK="true"
        break
      fi
    done
  fi
  if [[ "$P_OK" != "true" ]]; then
    echo "ERRO: não foi possível criar peer WireGuard."
    exit 8
  fi
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
WG_OUTPUT_BASE="${WG_OUTPUT_BASE:-/Users/edgardcontente/Resilio Sync/Salt - Operacional/Automação/Wireguard}"
OUT_DIR="$WG_OUTPUT_BASE/${SITE_NAME// /_}"
mkdir -p "$OUT_DIR"
CONF_FILE="$OUT_DIR/${CLIENT_NAME}-${TIMESTAMP}.conf"
SUMMARY_FILE="$OUT_DIR/${CLIENT_NAME}-${TIMESTAMP}.txt"

cat > "$CONF_FILE" <<EOF
[Interface]
PrivateKey = $WG_CLIENT_PRIVATE_KEY
Address = $WG_CLIENT_IP
DNS = $WG_DNS
MTU = $WG_INTERFACE_MTU

[Peer]
PublicKey = $WG_SERVER_PUBLIC_KEY
Endpoint = $WG_ENDPOINT
AllowedIPs = $WG_ALLOWED_IPS
PersistentKeepalive = $WG_KEEPALIVE
EOF

cat > "$SUMMARY_FILE" <<EOF
Site: $SITE_NAME
Cliente: $CLIENT_NAME
Controller ID: ${OMADA_CONTROLLER_ID:-N/A}
Site ID: $OMADA_SITE_ID

Interface:
- Name: $WG_INTERFACE_NAME
- Local IP: $WG_INTERFACE_LOCAL_IP
- Listen Port: $WG_INTERFACE_LISTEN_PORT
- MTU: $WG_INTERFACE_MTU
- Created now: $IF_CREATED

Peer:
- Name: $CLIENT_NAME
- Allowed Address: $WG_CLIENT_IP
- Public Key (client): $WG_CLIENT_PUBLIC_KEY
- Persistent Keepalive: $WG_KEEPALIVE

Arquivo para importar no cliente:
$CONF_FILE
EOF

echo "OK: provisão no Omada concluída."
echo "CONF: $CONF_FILE"
echo "SUMMARY: $SUMMARY_FILE"
