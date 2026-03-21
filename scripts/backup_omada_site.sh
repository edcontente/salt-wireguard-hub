#!/usr/bin/env bash
set -uo pipefail

: "${OMADA_URL:?OMADA_URL é obrigatório}"
: "${OMADA_USERNAME:?OMADA_USERNAME é obrigatório}"
: "${OMADA_PASSWORD:?OMADA_PASSWORD é obrigatório}"
: "${OMADA_SITE_ID:?OMADA_SITE_ID é obrigatório}"

OMADA_CONTROLLER_ID="${OMADA_CONTROLLER_ID:-}"
SITE_NAME="${SITE_NAME:-site}"

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

call_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  local url="$BASE_URL$API_PREFIX$path"
  http_json "$method" "$url" "$data"
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

call_api POST "/api/v2/sites/$OMADA_SITE_ID/cmd/switch"
SW_ERR="$(extract_error_code "$BODY")"
if [[ "$HTTP_CODE" != "200" || "$SW_ERR" != "0" ]]; then
  echo "ERRO: switch site falhou (HTTP $HTTP_CODE errorCode ${SW_ERR:-N/A})"
  exit 3
fi

TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="wireguard-output/site-backups/${SITE_NAME// /_}"
mkdir -p "$OUT_DIR"
REPORT="$OUT_DIR/backup-$TS.txt"

ENDPOINTS=(
  "/api/v2/sites/$OMADA_SITE_ID/setting/wireguard"
  "/api/v2/sites/$OMADA_SITE_ID/setting/wireguard/peer"
  "/api/v2/sites/$OMADA_SITE_ID/cmd/switch"
)

{
  echo "Omada Site Backup"
  echo "Date: $(date)"
  echo "Base URL: $BASE_URL"
  echo "Controller ID: ${OMADA_CONTROLLER_ID:-N/A}"
  echo "Site: $SITE_NAME"
  echo "Site ID: $OMADA_SITE_ID"
  echo "API Prefix: $API_PREFIX"
  echo
  printf '%-60s %-6s %-10s %s\n' "ENDPOINT" "HTTP" "errorCode" "FILE"
  printf '%-60s %-6s %-10s %s\n' "--------" "----" "---------" "----"

  for ep in "${ENDPOINTS[@]}"; do
    m="GET"
    [[ "$ep" == */cmd/switch ]] && m="POST"
    call_api "$m" "$ep"
    ec="$(extract_error_code "$BODY")"
    f="$OUT_DIR/$(echo "$ep" | sed 's#^/##; s#[/:]#_#g').json"
    echo "$BODY" > "$f"
    printf '%-60s %-6s %-10s %s\n' "$ep" "$HTTP_CODE" "${ec:-}" "$f"
  done
} | tee "$REPORT"

echo
echo "Backup salvo em: $OUT_DIR"
echo "Relatório: $REPORT"
