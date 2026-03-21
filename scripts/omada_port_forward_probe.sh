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

extract_token() {
  node -e 'try{const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o?.result?.token||""))}catch{process.stdout.write("")}' "$1"
}

extract_error_code() {
  node -e 'try{const o=JSON.parse(process.argv[1]||"{}");const e=o?.errorCode;process.stdout.write(e===undefined?"":String(e))}catch{process.stdout.write("")}' "$1"
}

extract_msg() {
  node -e 'try{const o=JSON.parse(process.argv[1]||"{}");process.stdout.write(String(o?.msg||""))}catch{process.stdout.write("")}' "$1"
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

ENDPOINTS=(
  "/api/v2/sites/$OMADA_SITE_ID/setting/port-forwarding"
  "/api/v2/sites/$OMADA_SITE_ID/setting/portForwarding"
  "/api/v2/sites/$OMADA_SITE_ID/setting/virtual-server"
  "/api/v2/sites/$OMADA_SITE_ID/setting/virtualServer"
  "/api/v2/sites/$OMADA_SITE_ID/setting/nat"
  "/api/v2/sites/$OMADA_SITE_ID/setting/firewall"
  "/api/v2/sites/$OMADA_SITE_ID/setting/firewall/nat"
  "/api/v2/sites/$OMADA_SITE_ID/setting/vpn"
)

echo
printf '%-65s %-6s %-10s %s\n' "ENDPOINT" "HTTP" "errorCode" "msg"
printf '%-65s %-6s %-10s %s\n' "--------" "----" "---------" "---"
for ep in "${ENDPOINTS[@]}"; do
  http_json GET "$BASE_URL$API_PREFIX$ep"
  ec="$(extract_error_code "$BODY")"
  msg="$(extract_msg "$BODY" | tr '\n' ' ' | cut -c1-80)"
  printf '%-65s %-6s %-10s %s\n' "$ep" "$HTTP_CODE" "${ec:-}" "${msg:-}"
done

