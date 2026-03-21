#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/wireguard_peer_payloads.sh"

if [[ $# -lt 2 ]]; then
  echo "Uso: $0 <site_id> <site_name>"
  echo "Exemplo: $0 66fd301d1a3dcb78b8f3ef18 'Edgard Contente'"
  exit 1
fi

: "${OMADA_URL:?OMADA_URL é obrigatório}"
: "${OMADA_USERNAME:?OMADA_USERNAME é obrigatório}"
: "${OMADA_PASSWORD:?OMADA_PASSWORD é obrigatório}"
: "${HUB_PUBLIC_KEY:?HUB_PUBLIC_KEY é obrigatório}"
: "${HUB_ENDPOINT:?HUB_ENDPOINT é obrigatório (ex: 191.248.70.82:51821)}"

SITE_ID="$1"
SITE_NAME="$2"
OMADA_CONTROLLER_ID="${OMADA_CONTROLLER_ID:-}"

WG_INTERFACE_NAME="${WG_INTERFACE_NAME:-HUB-SPOKE}"
WG_INTERFACE_LOCAL_IP="${WG_INTERFACE_LOCAL_IP:-}"
WG_INTERFACE_LISTEN_PORT="${WG_INTERFACE_LISTEN_PORT:-51820}"
WG_INTERFACE_MTU="${WG_INTERFACE_MTU:-1420}"
WG_INTERFACE_PRIVATE_KEY="${WG_INTERFACE_PRIVATE_KEY:-}"
WG_KEEPALIVE="${WG_KEEPALIVE:-25}"
WG_HUB_ALLOWED_ADDR="${WG_HUB_ALLOWED_ADDR:-10.200.0.1/32}"
WG_PEER_NAME="${WG_PEER_NAME:-HUB-UPLINK}"
WG_SITE_IPAM_FILE="${WG_SITE_IPAM_FILE:-wireguard-output/ipam/site_tunnel_allocations.json}"
WG_OPENAPI_ENDPOINT_SYNC="${WG_OPENAPI_ENDPOINT_SYNC:-true}"
WG_FORCE_RECREATE="${WG_FORCE_RECREATE:-false}"
OMADA_OPENAPI_CLIENT_ID="${OMADA_OPENAPI_CLIENT_ID:-}"
OMADA_OPENAPI_CLIENT_SECRET="${OMADA_OPENAPI_CLIENT_SECRET:-}"
OMADA_OPENAPI_ACCESS_TOKEN="${OMADA_OPENAPI_ACCESS_TOKEN:-}"

BASE_URL="${OMADA_URL%/}"
HUB_HOST="${HUB_ENDPOINT%:*}"
HUB_PORT="${HUB_ENDPOINT##*:}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
COOKIE_JAR="$TMP_DIR/cookies.txt"
CSRF_TOKEN=""
API_PREFIX=""
HTTP_CODE=""
BODY=""
OPENAPI_HTTP_CODE=""
OPENAPI_BODY=""
ENDPOINT_SYNC_MODE="not-attempted"

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

openapi_http_json() {
  local method="$1"
  local url="$2"
  local token="$3"
  local data="${4:-}"
  local out_body="$TMP_DIR/openapi-body.json"
  local out_code="$TMP_DIR/openapi-code.txt"
  local curl_rc=0
  local auth_header=()
  if [[ -n "$token" ]]; then
    auth_header=(-H "Authorization: AccessToken=$token")
  fi

  if [[ -n "$data" ]]; then
    curl -k -sS -X "$method" "$url" \
      -H 'Content-Type: application/json' \
      "${auth_header[@]}" \
      --data "$data" \
      -o "$out_body" -w '%{http_code}' > "$out_code" || curl_rc=$?
  else
    curl -k -sS -X "$method" "$url" \
      "${auth_header[@]}" \
      -o "$out_body" -w '%{http_code}' > "$out_code" || curl_rc=$?
  fi

  if [[ "$curl_rc" -ne 0 ]]; then
    OPENAPI_HTTP_CODE="000"
    OPENAPI_BODY=""
    return 0
  fi

  OPENAPI_HTTP_CODE="$(cat "$out_code" 2>/dev/null || echo 000)"
  OPENAPI_BODY="$(cat "$out_body" 2>/dev/null || true)"
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

extract_openapi_access_token() {
  node -e 'try{const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o?.result?.accessToken||""))}catch{process.stdout.write("")}' "$1"
}

extract_interface_by_name() {
  node -e '
  const raw = process.argv[1] || "{}";
  const wanted = String(process.argv[2] || "").trim().toLowerCase();
  let o = {};
  try { o = JSON.parse(raw); } catch {}
  const rows = Array.isArray(o?.result?.data) ? o.result.data : [];
  const pick = rows.find((r) => String(r.name || "").trim().toLowerCase() === wanted);
  if (!pick) process.exit(0);
  process.stdout.write(JSON.stringify({
    id: String(pick.id || ""),
    name: String(pick.name || ""),
    publicKey: String(pick.publicKey || ""),
    localIp: String(pick.localIp || "")
  }));
  ' "$1" "$2"
}

extract_peer_by_name_or_key() {
  node -e '
  const raw = process.argv[1] || "{}";
  const wantedName = String(process.argv[2] || "").trim().toLowerCase();
  const wantedKey = String(process.argv[3] || "").trim();
  let o = {};
  try { o = JSON.parse(raw); } catch {}
  const rows = Array.isArray(o?.result?.data) ? o.result.data : [];
  const pick = rows.find((r) => {
    const n = String(r.name || "").trim().toLowerCase();
    const k = String(r.publicKey || "").trim();
    return (wantedName && n === wantedName) || (wantedKey && k === wantedKey);
  });
  if (!pick) process.exit(0);
  process.stdout.write(JSON.stringify({
    id: String(pick.id || ""),
    name: String(pick.name || ""),
    interfaceName: String(pick.interfaceName || ""),
    publicKey: String(pick.publicKey || ""),
    allowAddress: Array.isArray(pick.allowAddress) ? pick.allowAddress : []
  }));
  ' "$1" "$2" "$3"
}

extract_openapi_peer_by_name_or_key() {
  node -e '
  const raw = process.argv[1] || "{}";
  const wantedName = String(process.argv[2] || "").trim().toLowerCase();
  const wantedKey = String(process.argv[3] || "").trim();
  let o = {};
  try { o = JSON.parse(raw); } catch {}
  const rows = Array.isArray(o?.result?.data)
    ? o.result.data
    : (Array.isArray(o?.result) ? o.result : []);
  const pick = rows.find((r) => {
    const n = String(r.name || "").trim().toLowerCase();
    const k = String(r.publicKey || "").trim();
    return (wantedName && n === wantedName) || (wantedKey && k === wantedKey);
  });
  if (!pick) process.exit(0);
  process.stdout.write(JSON.stringify({
    id: String(pick.id || ""),
    name: String(pick.name || ""),
    interfaceId: String(pick.interfaceId || ""),
    publicKey: String(pick.publicKey || "")
  }));
  ' "$1" "$2" "$3"
}

extract_openapi_peer_state_by_id() {
  node -e '
  const raw = process.argv[1] || "{}";
  const wantedId = String(process.argv[2] || "").trim();
  let o = {};
  try { o = JSON.parse(raw); } catch {}
  const rows = Array.isArray(o?.result?.data)
    ? o.result.data
    : (Array.isArray(o?.result) ? o.result : []);
  const pick = rows.find((r) => String(r.id || "").trim() === wantedId);
  if (!pick) process.exit(0);
  process.stdout.write(JSON.stringify({
    id: String(pick.id || ""),
    endpoint: String(pick.endpoint || pick.endPoint || ""),
    endpointPort: pick.endpointPort === undefined || pick.endpointPort === null
      ? (pick.endPointPort === undefined || pick.endPointPort === null ? "" : String(pick.endPointPort))
      : String(pick.endpointPort),
    existDomain: String(pick.existDomain || "")
  }));
  ' "$1" "$2"
}

delete_call_ok() {
  local code="$1"
  local body="$2"
  local ec=""
  if [[ -n "$body" ]]; then
    ec="$(extract_error_code "$body")"
  fi
  if [[ "$code" == "204" ]]; then
    return 0
  fi
  if [[ "$code" == "200" && ( -z "$body" || -z "$ec" || "$ec" == "0" ) ]]; then
    return 0
  fi
  return 1
}

sync_peer_endpoint_openapi() {
  local internal_peer_id="$1"
  ENDPOINT_SYNC_MODE="internal-only"

  if [[ "${WG_OPENAPI_ENDPOINT_SYNC,,}" != "true" ]]; then
    ENDPOINT_SYNC_MODE="disabled"
    return 0
  fi

  if [[ -z "$OMADA_CONTROLLER_ID" ]]; then
    ENDPOINT_SYNC_MODE="missing-controller-id"
    echo "AVISO: OpenAPI endpoint sync ignorado (OMADA_CONTROLLER_ID ausente)."
    return 0
  fi

  local token="$OMADA_OPENAPI_ACCESS_TOKEN"
  if [[ -z "$token" ]]; then
    if [[ -z "$OMADA_OPENAPI_CLIENT_ID" || -z "$OMADA_OPENAPI_CLIENT_SECRET" ]]; then
      ENDPOINT_SYNC_MODE="missing-openapi-credentials"
      echo "AVISO: endpoint pode exigir ajuste manual sem OpenAPI. Configure OMADA_OPENAPI_CLIENT_ID/SECRET para automatizar."
      return 0
    fi

    local auth_payload
    auth_payload="$(cat <<EOF
{"client_id":"$OMADA_OPENAPI_CLIENT_ID","client_secret":"$OMADA_OPENAPI_CLIENT_SECRET","omadacId":"$OMADA_CONTROLLER_ID","grant_type":"client_credentials"}
EOF
)"
    # Some Omada builds validate client_credentials only when the same fields
    # are duplicated in both the query string and the JSON body.
    local auth_url="$BASE_URL/openapi/authorize/token?grant_type=client_credentials&client_id=$OMADA_OPENAPI_CLIENT_ID&client_secret=$OMADA_OPENAPI_CLIENT_SECRET&omadacId=$OMADA_CONTROLLER_ID"
    openapi_http_json POST "$auth_url" "" "$auth_payload"
    local auth_ec
    auth_ec="$(extract_error_code "$OPENAPI_BODY")"
    token="$(extract_openapi_access_token "$OPENAPI_BODY")"
    if [[ "$OPENAPI_HTTP_CODE" != "200" || "$auth_ec" != "0" || -z "$token" ]]; then
      ENDPOINT_SYNC_MODE="openapi-auth-failed"
      echo "AVISO: OpenAPI auth falhou (HTTP $OPENAPI_HTTP_CODE errorCode ${auth_ec:-N/A})."
      return 0
    fi
    OMADA_OPENAPI_ACCESS_TOKEN="$token"
  fi

  local openapi_peer_id="$internal_peer_id"
  local base_peer_path="/openapi/v1/$OMADA_CONTROLLER_ID/sites/$SITE_ID/vpn/wireguard-peers"
  local peer_list_url="$BASE_URL$base_peer_path?page=1&pageSize=50"
  openapi_http_json GET "$peer_list_url" "$token"
  local ls_ec
  ls_ec="$(extract_error_code "$OPENAPI_BODY")"
  if [[ "$OPENAPI_HTTP_CODE" == "200" && "$ls_ec" == "0" ]]; then
    local openapi_peer_json
    openapi_peer_json="$(extract_openapi_peer_by_name_or_key "$OPENAPI_BODY" "$WG_PEER_NAME" "$HUB_PUBLIC_KEY")"
    local resolved_id
    resolved_id="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.id||""))' "$openapi_peer_json")"
    [[ -n "$resolved_id" ]] && openapi_peer_id="$resolved_id"
  fi

  if [[ -z "$openapi_peer_id" ]]; then
    ENDPOINT_SYNC_MODE="openapi-peer-id-missing"
    echo "AVISO: OpenAPI endpoint sync ignorado (peerId não encontrado)."
    return 0
  fi

  local openapi_base_payload
  openapi_base_payload="$(cat <<EOF
{"id":"$openapi_peer_id","name":"$WG_PEER_NAME","status":true,"interfaceId":"$IF_ID","interfaceName":"$WG_INTERFACE_NAME","publicKey":"$HUB_PUBLIC_KEY","allowAddress":["$WG_HUB_ALLOWED_ADDR"],"allowedIPs":["$WG_HUB_ALLOWED_ADDR"],"keepAlive":$WG_KEEPALIVE,"persistentKeepalive":$WG_KEEPALIVE,"existDomain":false}
EOF
)"
  local peer_update_payloads=()
  mapfile -t peer_update_payloads < <(
    wireguard_peer_endpoint_payload_variants \
      "$openapi_base_payload" \
      "$HUB_ENDPOINT" \
      "$HUB_HOST" \
      "$HUB_PORT"
  )

  local ok="false"
  for payload in "${peer_update_payloads[@]}"; do
    openapi_http_json PUT "$BASE_URL$base_peer_path/$openapi_peer_id" "$token" "$payload"
    local ec
    ec="$(extract_error_code "$OPENAPI_BODY")"
    local msg
    msg="$(extract_msg "$OPENAPI_BODY" | tr '\n' ' ')"
    echo "OPENAPI PEER PUT => HTTP $OPENAPI_HTTP_CODE errorCode ${ec:-N/A} msg: ${msg:-N/A}"
    if [[ "$OPENAPI_HTTP_CODE" == "200" && "$ec" == "0" ]]; then
      ok="true"
      break
    fi
  done

  if [[ "$ok" == "true" ]]; then
    openapi_http_json GET "$peer_list_url" "$token"
    local verify_ec verify_json verify_endpoint verify_endpoint_port
    verify_ec="$(extract_error_code "$OPENAPI_BODY")"
    if [[ "$OPENAPI_HTTP_CODE" == "200" && "$verify_ec" == "0" ]]; then
      verify_json="$(extract_openapi_peer_state_by_id "$OPENAPI_BODY" "$openapi_peer_id")"
      verify_endpoint="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.endpoint||""))' "$verify_json")"
      verify_endpoint_port="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.endpointPort||""))' "$verify_json")"
      if [[ -n "$verify_endpoint" || -n "$verify_endpoint_port" ]]; then
        ENDPOINT_SYNC_MODE="openapi-ok"
      else
        ENDPOINT_SYNC_MODE="openapi-accepted-no-endpoint"
        echo "AVISO: OpenAPI aceitou o update, mas o peer continuou sem endpoint/porta visíveis na releitura."
      fi
    else
      ENDPOINT_SYNC_MODE="openapi-accepted-unverified"
      echo "AVISO: OpenAPI aceitou o update, mas a releitura do peer falhou; confirme endpoint/porta no Omada."
    fi
  else
    ENDPOINT_SYNC_MODE="openapi-failed"
    echo "AVISO: OpenAPI não confirmou atualização do endpoint. Revise o peer no Omada."
  fi
  return 0
}

build_prefixes() {
  local list=("")
  if [[ -n "$OMADA_CONTROLLER_ID" ]]; then
    list=("/$OMADA_CONTROLLER_ID" "")
  fi
  printf '%s\n' "${list[@]}"
}

ensure_site_ipam_dir() {
  mkdir -p "$(dirname "$WG_SITE_IPAM_FILE")"
  if [[ ! -f "$WG_SITE_IPAM_FILE" ]]; then
    cat > "$WG_SITE_IPAM_FILE" <<'EOF'
{
  "updatedAt": "",
  "source": "site-spoke-provision",
  "allocations": []
}
EOF
  fi
}

resolve_or_allocate_site_ip() {
  local result
  result="$(
    node - <<'NODE' "$WG_SITE_IPAM_FILE" "$SITE_ID" "$SITE_NAME"
const fs = require('fs');
const ipamPath = process.argv[2];
const siteId = String(process.argv[3] || '').trim();
const siteName = String(process.argv[4] || '').trim();

const out = { ip: '', action: 'none', data: null };
let parsed = { updatedAt: '', source: 'site-spoke-provision', allocations: [] };
try {
  parsed = JSON.parse(fs.readFileSync(ipamPath, 'utf8'));
} catch {}
if (!Array.isArray(parsed.allocations)) parsed.allocations = [];

const active = parsed.allocations.filter((a) => String(a.status || 'active') === 'active');
const current = active.find((a) => String(a.siteId || '') === siteId);
if (current && current.tunnelIp) {
  out.ip = String(current.tunnelIp);
  out.action = 'existing';
  out.data = parsed;
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

const used = new Set(
  active
    .map((a) => String(a.tunnelIp || ''))
    .filter((ip) => /^10\.200\.0\.\d{1,3}$/.test(ip))
);
let chosen = '';
for (let oct = 10; oct <= 250; oct += 1) {
  const ip = `10.200.0.${oct}`;
  if (!used.has(ip)) {
    chosen = ip;
    break;
  }
}
if (!chosen) {
  process.stderr.write('ERRO: sem IP livre no pool 10.200.0.10-250\n');
  process.exit(2);
}

parsed.allocations.push({
  siteId,
  siteName,
  tunnelIp: chosen,
  status: 'active',
  updatedAt: new Date().toISOString()
});
parsed.updatedAt = new Date().toISOString();
out.ip = chosen;
out.action = 'allocated';
out.data = parsed;
process.stdout.write(JSON.stringify(out));
NODE
  )"

  local ip action
  ip="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.ip||""))' "$result")"
  action="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.action||""))' "$result")"
  local data
  data="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(JSON.stringify(o.data||{}))' "$result")"
  if [[ -z "$ip" ]]; then
    echo "ERRO: falha ao resolver/alocar IP do site."
    exit 9
  fi
  echo "$data" > "$WG_SITE_IPAM_FILE"
  WG_INTERFACE_LOCAL_IP="$ip"
  echo "IPAM site tunnel: $action -> $WG_INTERFACE_LOCAL_IP"
}

if [[ -z "$WG_INTERFACE_PRIVATE_KEY" ]]; then
  WG_INTERFACE_PRIVATE_KEY="$(openssl rand -base64 32 | tr -d '\r\n')"
fi

if [[ -z "$WG_INTERFACE_LOCAL_IP" ]]; then
  ensure_site_ipam_dir
  resolve_or_allocate_site_ip
fi

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

http_json POST "$BASE_URL$API_PREFIX/api/v2/sites/$SITE_ID/cmd/switch"
SW_ERR="$(extract_error_code "$BODY")"
if [[ "$HTTP_CODE" != "200" || "$SW_ERR" != "0" ]]; then
  echo "ERRO: switch site falhou (HTTP $HTTP_CODE errorCode ${SW_ERR:-N/A})"
  exit 3
fi

IF_EP="/api/v2/sites/$SITE_ID/setting/wireguard"
PEER_EP="/api/v2/sites/$SITE_ID/setting/wireguard/peer"

http_json GET "$BASE_URL$API_PREFIX$IF_EP"
IF_ERR="$(extract_error_code "$BODY")"
if [[ "$HTTP_CODE" != "200" || "$IF_ERR" != "0" ]]; then
  echo "ERRO: GET interface falhou (HTTP $HTTP_CODE errorCode ${IF_ERR:-N/A})"
  exit 4
fi

IF_JSON="$(extract_interface_by_name "$BODY" "$WG_INTERFACE_NAME")"
IF_CREATED="false"
if [[ -z "$IF_JSON" ]]; then
  IF_CREATED="true"
  IF_PAYLOADS=(
    "{\"name\":\"$WG_INTERFACE_NAME\",\"enable\":true,\"mtu\":$WG_INTERFACE_MTU,\"listenPort\":$WG_INTERFACE_LISTEN_PORT,\"localIpAddress\":\"$WG_INTERFACE_LOCAL_IP\",\"privateKey\":\"$WG_INTERFACE_PRIVATE_KEY\"}"
    "{\"name\":\"$WG_INTERFACE_NAME\",\"status\":true,\"mtu\":$WG_INTERFACE_MTU,\"port\":$WG_INTERFACE_LISTEN_PORT,\"localIp\":\"$WG_INTERFACE_LOCAL_IP\",\"privateKey\":\"$WG_INTERFACE_PRIVATE_KEY\"}"
    "{\"interfaceName\":\"$WG_INTERFACE_NAME\",\"enabled\":true,\"mtu\":$WG_INTERFACE_MTU,\"listenPort\":$WG_INTERFACE_LISTEN_PORT,\"address\":\"$WG_INTERFACE_LOCAL_IP\",\"privateKey\":\"$WG_INTERFACE_PRIVATE_KEY\"}"
    "{\"name\":\"$WG_INTERFACE_NAME\",\"interfaceName\":\"$WG_INTERFACE_NAME\",\"enable\":true,\"enabled\":true,\"status\":true,\"mtu\":$WG_INTERFACE_MTU,\"listenPort\":$WG_INTERFACE_LISTEN_PORT,\"port\":$WG_INTERFACE_LISTEN_PORT,\"localIpAddress\":\"$WG_INTERFACE_LOCAL_IP\",\"localIp\":\"$WG_INTERFACE_LOCAL_IP\",\"address\":\"$WG_INTERFACE_LOCAL_IP\",\"privateKey\":\"$WG_INTERFACE_PRIVATE_KEY\"}"
  )
  IF_OK="false"
  for payload in "${IF_PAYLOADS[@]}"; do
    http_json POST "$BASE_URL$API_PREFIX$IF_EP" "$payload"
    ec="$(extract_error_code "$BODY")"
    msg="$(extract_msg "$BODY" | tr '\n' ' ')"
    echo "IF POST => HTTP $HTTP_CODE errorCode ${ec:-N/A} msg: ${msg:-N/A}"
    if [[ "$HTTP_CODE" == "200" && "$ec" == "0" ]]; then
      IF_OK="true"
      break
    fi
  done
  if [[ "$IF_OK" != "true" ]]; then
    echo "ERRO: não foi possível criar interface $WG_INTERFACE_NAME."
    exit 5
  fi

  http_json GET "$BASE_URL$API_PREFIX$IF_EP"
  IF_JSON="$(extract_interface_by_name "$BODY" "$WG_INTERFACE_NAME")"
fi

if [[ -z "$IF_JSON" ]]; then
  echo "ERRO: interface não encontrada após criação/leitura."
  exit 6
fi

IF_ID="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.id||""))' "$IF_JSON")"
SITE_PUBLIC_KEY="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.publicKey||""))' "$IF_JSON")"
SITE_LOCAL_IP="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.localIp||""))' "$IF_JSON")"

http_json GET "$BASE_URL$API_PREFIX$PEER_EP"
PEER_ERR="$(extract_error_code "$BODY")"
if [[ "$HTTP_CODE" != "200" || "$PEER_ERR" != "0" ]]; then
  echo "ERRO: GET peer falhou (HTTP $HTTP_CODE errorCode ${PEER_ERR:-N/A})"
  exit 7
fi

PEER_JSON="$(extract_peer_by_name_or_key "$BODY" "$WG_PEER_NAME" "$HUB_PUBLIC_KEY")"
PEER_ID=""

if [[ "${WG_FORCE_RECREATE,,}" == "true" ]]; then
  echo "Reconciliação completa: remoção prévia de peer/interface existente."
  if [[ -n "$PEER_JSON" ]]; then
    PEER_ID="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.id||""))' "$PEER_JSON")"
    if [[ -n "$PEER_ID" ]]; then
      http_json DELETE "$BASE_URL$API_PREFIX$PEER_EP/$PEER_ID"
      if delete_call_ok "$HTTP_CODE" "$BODY"; then
        echo "PEER DELETE => HTTP $HTTP_CODE ok"
      else
        echo "ERRO: não foi possível remover peer existente $WG_PEER_NAME (HTTP $HTTP_CODE errorCode $(extract_error_code "$BODY"))."
        exit 10
      fi
    fi
  fi

  if [[ -n "$IF_JSON" ]]; then
    IF_ID="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.id||""))' "$IF_JSON")"
    if [[ -n "$IF_ID" ]]; then
      http_json DELETE "$BASE_URL$API_PREFIX$IF_EP/$IF_ID"
      if delete_call_ok "$HTTP_CODE" "$BODY"; then
        echo "IF DELETE => HTTP $HTTP_CODE ok"
      else
        echo "ERRO: não foi possível remover interface existente $WG_INTERFACE_NAME (HTTP $HTTP_CODE errorCode $(extract_error_code "$BODY"))."
        exit 11
      fi
    fi
  fi

  http_json GET "$BASE_URL$API_PREFIX$IF_EP"
  IF_JSON="$(extract_interface_by_name "$BODY" "$WG_INTERFACE_NAME")"
  PEER_JSON=""
  PEER_ID=""
  IF_CREATED="true"
fi

if [[ -n "$PEER_JSON" ]]; then
  PEER_CREATED="false"
  PEER_ID="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.id||""))' "$PEER_JSON")"
  peer_update_base_payload="$(cat <<EOF
{"id":"$PEER_ID","name":"$WG_PEER_NAME","status":true,"interfaceId":"$IF_ID","interfaceName":"$WG_INTERFACE_NAME","publicKey":"$HUB_PUBLIC_KEY","existDomain":false,"allowAddress":["$WG_HUB_ALLOWED_ADDR"],"keepAlive":$WG_KEEPALIVE}
EOF
)"
  peer_update_legacy_payload="$(cat <<EOF
{"id":"$PEER_ID","name":"$WG_PEER_NAME","status":true,"interfaceId":"$IF_ID","interfaceName":"$WG_INTERFACE_NAME","publicKey":"$HUB_PUBLIC_KEY","existDomain":false,"allowAddress":["$WG_HUB_ALLOWED_ADDR"],"persistentKeepalive":$WG_KEEPALIVE,"keepalive":$WG_KEEPALIVE}
EOF
)"
  PEER_UPDATE_PAYLOADS=()
  mapfile -t PEER_UPDATE_PAYLOADS < <(
    wireguard_peer_endpoint_payload_variants \
      "$peer_update_base_payload" \
      "$HUB_ENDPOINT" \
      "$HUB_HOST" \
      "$HUB_PORT"
  )
  mapfile -t -O "${#PEER_UPDATE_PAYLOADS[@]}" PEER_UPDATE_PAYLOADS < <(
    wireguard_peer_endpoint_payload_variants \
      "$peer_update_legacy_payload" \
      "$HUB_ENDPOINT" \
      "$HUB_HOST" \
      "$HUB_PORT"
  )
  PEER_UPDATE_PAYLOADS+=("$peer_update_base_payload")
  PEER_UPD_OK="false"
  for payload in "${PEER_UPDATE_PAYLOADS[@]}"; do
    http_json PUT "$BASE_URL$API_PREFIX$PEER_EP/$PEER_ID" "$payload"
    ec="$(extract_error_code "$BODY")"
    msg="$(extract_msg "$BODY" | tr '\n' ' ')"
    echo "PEER PUT => HTTP $HTTP_CODE errorCode ${ec:-N/A} msg: ${msg:-N/A}"
    if [[ "$HTTP_CODE" == "200" && "$ec" == "0" ]]; then
      PEER_UPD_OK="true"
      break
    fi
  done
  if [[ "$PEER_UPD_OK" == "true" ]]; then
    echo "Peer $WG_PEER_NAME já existia e foi reconciliado via PUT."
  else
    echo "AVISO: peer existente não pôde ser reconciliado via PUT; configuração atual foi preservada."
  fi
else
  PEER_CREATED="true"
  peer_create_base_payload="$(cat <<EOF
{"name":"$WG_PEER_NAME","status":true,"enable":true,"interfaceId":"$IF_ID","interfaceName":"$WG_INTERFACE_NAME","allowedAddress":"$WG_HUB_ALLOWED_ADDR","allowAddress":"$WG_HUB_ALLOWED_ADDR","allowedIps":["$WG_HUB_ALLOWED_ADDR"],"publicKey":"$HUB_PUBLIC_KEY","persistentKeepalive":$WG_KEEPALIVE,"keepalive":$WG_KEEPALIVE,"existDomain":false,"presharedKey":""}
EOF
)"
  peer_create_interface_payload="$(cat <<EOF
{"name":"$WG_PEER_NAME","interface":"$WG_INTERFACE_NAME","allowedAddress":"$WG_HUB_ALLOWED_ADDR","publicKey":"$HUB_PUBLIC_KEY","persistentKeepalive":$WG_KEEPALIVE}
EOF
)"
  peer_create_name_payload="$(cat <<EOF
{"name":"$WG_PEER_NAME","interfaceName":"$WG_INTERFACE_NAME","allowAddress":"$WG_HUB_ALLOWED_ADDR","publicKey":"$HUB_PUBLIC_KEY","keepalive":$WG_KEEPALIVE,"existDomain":false}
EOF
)"
  PEER_PAYLOADS=()
  mapfile -t PEER_PAYLOADS < <(
    wireguard_peer_endpoint_payload_variants \
      "$peer_create_base_payload" \
      "$HUB_ENDPOINT" \
      "$HUB_HOST" \
      "$HUB_PORT"
  )
  mapfile -t -O "${#PEER_PAYLOADS[@]}" PEER_PAYLOADS < <(
    wireguard_peer_endpoint_payload_variants \
      "$peer_create_interface_payload" \
      "$HUB_ENDPOINT" \
      "$HUB_HOST" \
      "$HUB_PORT"
  )
  mapfile -t -O "${#PEER_PAYLOADS[@]}" PEER_PAYLOADS < <(
    wireguard_peer_endpoint_payload_variants \
      "$peer_create_name_payload" \
      "$HUB_ENDPOINT" \
      "$HUB_HOST" \
      "$HUB_PORT"
  )
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
    echo "ERRO: não foi possível criar peer HUB-UPLINK."
    exit 8
  fi
fi

if [[ -z "$PEER_ID" ]]; then
  http_json GET "$BASE_URL$API_PREFIX$PEER_EP"
  PEER_JSON="$(extract_peer_by_name_or_key "$BODY" "$WG_PEER_NAME" "$HUB_PUBLIC_KEY")"
  PEER_ID="$(node -e 'const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o.id||""))' "$PEER_JSON")"
fi

sync_peer_endpoint_openapi "$PEER_ID"

echo
echo "OK: spoke site->hub provisionado."
echo "Site: $SITE_NAME"
echo "Site ID: $SITE_ID"
echo "Interface: $WG_INTERFACE_NAME (created_now=$IF_CREATED)"
echo "Site tunnel IP: $SITE_LOCAL_IP"
echo "Site public key: $SITE_PUBLIC_KEY"
echo "Hub endpoint: $HUB_ENDPOINT"
echo "Hub allowed addr no site: $WG_HUB_ALLOWED_ADDR"
echo "Peer no site: $WG_PEER_NAME (created_now=$PEER_CREATED)"
echo "Endpoint sync mode: $ENDPOINT_SYNC_MODE"
