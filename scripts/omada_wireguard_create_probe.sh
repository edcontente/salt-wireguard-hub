#!/usr/bin/env bash
set -uo pipefail

: "${OMADA_URL:?OMADA_URL é obrigatório}"
: "${OMADA_USERNAME:?OMADA_USERNAME é obrigatório}"
: "${OMADA_PASSWORD:?OMADA_PASSWORD é obrigatório}"
: "${OMADA_SITE_ID:?OMADA_SITE_ID é obrigatório}"

OMADA_CONTROLLER_ID="${OMADA_CONTROLLER_ID:-}"
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

build_prefixes() {
  local list=("")
  if [[ -n "$OMADA_CONTROLLER_ID" ]]; then
    list=("/$OMADA_CONTROLLER_ID" "")
  fi
  printf '%s\n' "${list[@]}"
}

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
echo "Switch site: HTTP $HTTP_CODE errorCode ${SW_ERR:-N/A}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="wireguard-output/api-probe"
mkdir -p "$OUT_DIR"
REPORT="$OUT_DIR/omada-wireguard-create-probe-$TIMESTAMP.txt"
DETAIL_DIR="$OUT_DIR/omada-wireguard-create-probe-$TIMESTAMP-detail"
mkdir -p "$DETAIL_DIR"

save_case_response() {
  local case_name="$1"
  local method="$2"
  local endpoint="$3"
  local payload="$4"
  local file="$DETAIL_DIR/${case_name}.json"
  cat > "$file" <<EOF
{
  "case": "$case_name",
  "method": "$method",
  "endpoint": "$endpoint",
  "http": "$HTTP_CODE",
  "errorCode": "$(extract_error_code "$BODY")",
  "msg": "$(extract_msg "$BODY" | sed 's/"/\\"/g')",
  "payload": $payload,
  "response": $BODY
}
EOF
}

run_case() {
  local case_name="$1"
  local method="$2"
  local endpoint="$3"
  local payload="$4"
  local data=""
  if [[ "$payload" != "null" ]]; then
    data="$payload"
  fi
  http_json "$method" "$BASE_URL$API_PREFIX$endpoint" "$data"
  local ec msg
  ec="$(extract_error_code "$BODY")"
  msg="$(extract_msg "$BODY" | tr '\n' ' ' | cut -c1-90)"
  printf '%-36s %-7s %-58s %-6s %-10s %-90s\n' "$case_name" "$method" "$endpoint" "$HTTP_CODE" "${ec:-}" "${msg:-}"
  save_case_response "$case_name" "$method" "$endpoint" "$payload"
}

EP_IF="/api/v2/sites/$OMADA_SITE_ID/setting/wireguard"
EP_PEER="/api/v2/sites/$OMADA_SITE_ID/setting/wireguard/peer"

{
  echo "Omada WireGuard CREATE Probe"
  echo "Date: $(date)"
  echo "Base URL: $BASE_URL"
  echo "API Prefix: $API_PREFIX"
  echo "Controller ID: ${OMADA_CONTROLLER_ID:-N/A}"
  echo "Site ID: $OMADA_SITE_ID"
  echo "Detail Dir: $DETAIL_DIR"
  echo
  printf '%-36s %-7s %-58s %-6s %-10s %-90s\n' "CASE" "METHOD" "ENDPOINT" "HTTP" "errorCode" "msg"
  printf '%-36s %-7s %-58s %-6s %-10s %-90s\n' "----" "------" "--------" "----" "---------" "---"

  # Baseline
  run_case "if-get" "GET" "$EP_IF" "null"
  run_case "peer-get" "GET" "$EP_PEER" "null"

  # Interface probes (candidatos de campos da UI Omada)
  run_case "if-post-empty" "POST" "$EP_IF" '{"_probe":"1"}'
  run_case "if-post-basic-a" "POST" "$EP_IF" '{"name":"Home","enable":true,"mtu":1280,"listenPort":51820,"localIpAddress":"192.168.50.10","privateKey":"x"}'
  run_case "if-post-basic-b" "POST" "$EP_IF" '{"name":"Home","status":true,"mtu":1280,"port":51820,"localIp":"192.168.50.10","privateKey":"x"}'
  run_case "if-post-basic-c" "POST" "$EP_IF" '{"interfaceName":"Home","enabled":true,"mtu":1280,"listenPort":51820,"address":"192.168.50.10","privateKey":"x"}'
  run_case "if-put-empty" "PUT" "$EP_IF" '{"_probe":"1"}'
  run_case "if-put-basic-a" "PUT" "$EP_IF" '{"name":"Home","enable":true,"mtu":1280,"listenPort":51820,"localIpAddress":"192.168.50.10","privateKey":"x"}'

  # Peer probes (candidatos de campos da UI Omada)
  run_case "peer-post-empty" "POST" "$EP_PEER" '{"_probe":"1"}'
  run_case "peer-post-basic-a" "POST" "$EP_PEER" '{"name":"MBP","interface":"Home","allowedAddress":"192.168.50.11/32","publicKey":"x","persistentKeepalive":25}'
  run_case "peer-post-basic-b" "POST" "$EP_PEER" '{"name":"MBP","interfaceName":"Home","allowAddress":"192.168.50.11/32","publicKey":"x","keepalive":25}'
  run_case "peer-post-basic-c" "POST" "$EP_PEER" '{"name":"MBP","wireguardName":"Home","allowedIps":["192.168.50.11/32"],"publicKey":"x","persistentKeepalive":25}'
} | tee "$REPORT"

echo
echo "Relatório salvo em: $REPORT"
echo "Detalhes JSON por tentativa em: $DETAIL_DIR"
echo "Envie o relatório + 2 ou 3 JSONs com melhores mensagens para eu travar payload final de CREATE."
