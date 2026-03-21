#!/usr/bin/env bash
set -uo pipefail

: "${OMADA_URL:?OMADA_URL é obrigatório (ex: https://omada.saltengenharia.com.br:8043)}"
: "${OMADA_USERNAME:?OMADA_USERNAME é obrigatório}"
: "${OMADA_PASSWORD:?OMADA_PASSWORD é obrigatório}"

MODE="probe"
if [[ "${1:-}" == "--discover-sites" ]]; then
  MODE="discover"
  shift
fi

OMADA_CONTROLLER_ID="${OMADA_CONTROLLER_ID:-}"
OMADA_SITE_NAME="${OMADA_SITE_NAME:-}"
OMADA_SITE_ID="${OMADA_SITE_ID:-}"
OMADA_SELECTED_SITE_ID="${OMADA_SELECTED_SITE_ID:-}"
OMADA_OUTPUT="${OMADA_OUTPUT:-text}" # text|json

if [[ -n "${1:-}" ]]; then
  OMADA_SITE_NAME="$1"
fi

BASE_URL="${OMADA_URL%/}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
COOKIE_JAR="$TMP_DIR/cookies.txt"

HTTP_CODE=""
BODY=""
CSRF_TOKEN=""
API_PREFIX=""
LOGIN_CONTROLLER_ID=""

SITE_ID=""
SITE_PATH=""
SITE_NAME_RESOLVED=""
SITES_JSON='[]'
SW_HTTP=""
SW_ERR=""

log() {
  echo "$*"
}

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
  node -e '
  try {
    const o = JSON.parse(process.argv[1] || "{}");
    process.stdout.write(String(o?.result?.token || ""));
  } catch { process.stdout.write(""); }
  ' "$1"
}

extract_controller_id() {
  node -e '
  try {
    const o = JSON.parse(process.argv[1] || "{}");
    const r = o?.result || {};
    process.stdout.write(String(r.omadacId || r.controllerId || r.omadac_id || ""));
  } catch { process.stdout.write(""); }
  ' "$1"
}

extract_error_code() {
  node -e '
  try {
    const o = JSON.parse(process.argv[1] || "{}");
    const e = o?.errorCode;
    process.stdout.write(e === undefined ? "" : String(e));
  } catch { process.stdout.write(""); }
  ' "$1"
}

extract_sites() {
  node -e '
  try {
    const o = JSON.parse(process.argv[1] || "{}");
    const data = o?.result?.data || o?.result || [];
    if (!Array.isArray(data)) { process.stdout.write("[]"); process.exit(0); }
    const out = data
      .map(s => ({
        id: String(s.id || s.siteId || s.key || s.site || ""),
        name: String(s.name || s.siteName || "")
      }))
      .filter(s => s.id && s.name);
    process.stdout.write(JSON.stringify(out));
  } catch { process.stdout.write("[]"); }
  ' "$1"
}

extract_site_candidates() {
  node -e '
  function walk(x, out) {
    if (!x) return;
    if (Array.isArray(x)) { x.forEach(v => walk(v, out)); return; }
    if (typeof x !== "object") return;
    const id = String(x.id || x.siteId || x.key || x.site || "");
    const name = String(x.name || x.siteName || x.label || "");
    if (id && name) out.push({ id, name });
    for (const k of Object.keys(x)) walk(x[k], out);
  }
  try {
    const o = JSON.parse(process.argv[1] || "{}");
    const out = [];
    walk(o?.result || o, out);
    const map = new Map();
    for (const s of out) {
      const key = `${s.id}|${s.name.toLowerCase()}`;
      if (!map.has(key)) map.set(key, s);
    }
    process.stdout.write(JSON.stringify([...map.values()]));
  } catch { process.stdout.write("[]"); }
  ' "$1"
}

merge_sites() {
  node -e '
  try {
    const a = JSON.parse(process.argv[1] || "[]");
    const b = JSON.parse(process.argv[2] || "[]");
    const all = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]
      .map(s => ({ id: String(s.id || ""), name: String(s.name || "") }))
      .filter(s => s.id && s.name);
    const map = new Map();
    for (const s of all) {
      const key = `${s.id}|${s.name.toLowerCase()}`;
      if (!map.has(key)) map.set(key, s);
    }
    process.stdout.write(JSON.stringify([...map.values()]));
  } catch { process.stdout.write("[]"); }
  ' "$1" "$2"
}

choose_site_id() {
  node -e '
  const sites = JSON.parse(process.argv[1] || "[]");
  const wanted = (process.argv[2] || "").trim().toLowerCase();
  let pick = null;
  if (wanted) pick = sites.find(s => (s.name || "").toLowerCase() === wanted);
  if (!pick) pick = sites.find(s => (s.name || "").toLowerCase() === "default") || sites[0] || null;
  process.stdout.write(pick?.id ? String(pick.id) : "");
  ' "$1" "$2"
}

find_site_name_by_id() {
  node -e '
  const sites = JSON.parse(process.argv[1] || "[]");
  const id = String(process.argv[2] || "");
  const pick = sites.find(s => String(s.id) === id);
  process.stdout.write(pick?.name ? String(pick.name) : "");
  ' "$1" "$2"
}

build_prefixes() {
  local list=("")
  if [[ -n "$OMADA_CONTROLLER_ID" ]]; then
    # Prioriza controller prefix quando informado explicitamente.
    list=("/$OMADA_CONTROLLER_ID" "")
  fi
  printf '%s\n' "${list[@]}"
}

call_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  local url=""

  if [[ "$path" == /api/v2/* ]]; then
    url="$BASE_URL$API_PREFIX$path"
  elif [[ "$path" == /setting/* || "$path" == /customers/* ]]; then
    url="$BASE_URL$API_PREFIX/api/v2$path"
  else
    url="$BASE_URL$API_PREFIX$path"
  fi

  http_json "$method" "$url" "$data"
}

discover_sites() {
  local s="[]"

  for p in \
    "/api/v2/customer/sites" \
    "/api/v2/customer/sites?currentPage=1&currentPageSize=100" \
    "/api/v2/customer/sites?currentPage=1&currentPageSize=100&searchKey=&favorites=false" \
    "/api/v2/customer/sites?currentPage=1&pageSize=100" \
    "/api/v2/sites" \
    "/api/v2/site" \
    "/setting/sites"; do
    call_api GET "$p"
    if [[ "$HTTP_CODE" == "200" ]]; then
      s="$(extract_sites "$BODY")"
      SITES_JSON="$(merge_sites "$SITES_JSON" "$s")"
      [[ "$s" != "[]" && -z "$SITE_PATH" ]] && SITE_PATH="$p"
    fi
  done

  for payload in \
    '{"currentPage":1,"currentPageSize":100}' \
    '{"pagingData":{"currentPage":1,"currentPageSize":100}}' \
    '{"currentPage":1,"currentPageSize":100,"searchKey":"","favorites":false}'; do
    call_api POST "/api/v2/customer/sites" "$payload"
    if [[ "$HTTP_CODE" == "200" ]]; then
      s="$(extract_sites "$BODY")"
      SITES_JSON="$(merge_sites "$SITES_JSON" "$s")"
      [[ "$s" != "[]" && -z "$SITE_PATH" ]] && SITE_PATH="/api/v2/customer/sites (POST)"
    fi
  done

  call_api GET "/api/v2/current/user-popup"
  if [[ "$HTTP_CODE" == "200" ]]; then
    s="$(extract_site_candidates "$BODY")"
    SITES_JSON="$(merge_sites "$SITES_JSON" "$s")"
    [[ "$s" != "[]" && -z "$SITE_PATH" ]] && SITE_PATH="/api/v2/current/user-popup (parsed)"
  fi
}

emit_discover_json_and_exit() {
  local ok="$1"
  local message="$2"
  local switch_ok="false"
  [[ "$SW_HTTP" == "200" && "$SW_ERR" == "0" ]] && switch_ok="true"

  node -e '
  const payload = {
    ok: process.argv[1] === "true",
    message: process.argv[2],
    controllerId: process.argv[3],
    apiPrefix: process.argv[4],
    siteSource: process.argv[5],
    selectedSiteId: process.argv[6],
    selectedSiteName: process.argv[7],
    switchStatus: {
      attempted: process.argv[8] === "true",
      http: process.argv[9] || "",
      errorCode: process.argv[10] || "",
      ok: process.argv[11] === "true"
    },
    sites: JSON.parse(process.argv[12] || "[]")
  };
  process.stdout.write(JSON.stringify(payload));
  ' \
  "$ok" \
  "$message" \
  "${OMADA_CONTROLLER_ID:-$LOGIN_CONTROLLER_ID}" \
  "$API_PREFIX" \
  "$SITE_PATH" \
  "$SITE_ID" \
  "$SITE_NAME_RESOLVED" \
  "$([[ -n "$SITE_ID" ]] && echo true || echo false)" \
  "$SW_HTTP" \
  "$SW_ERR" \
  "$switch_ok" \
  "$SITES_JSON"

  exit 0
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
    LOGIN_CONTROLLER_ID="$cid"
    break
  fi
done < <(build_prefixes)

if [[ -z "$CSRF_TOKEN" ]]; then
  if [[ "$MODE" == "discover" && "$OMADA_OUTPUT" == "json" ]]; then
    SITES_JSON='[]'
    emit_discover_json_and_exit false "Falha no login (verifique URL/usuário/senha)."
  fi
  log "ERRO: login falhou (URL/usuário/senha/prefixo de controller)."
  log "Dica: exporte OMADA_CONTROLLER_ID se seu ambiente exigir."
  exit 2
fi

log "OK login em: $BASE_URL$API_PREFIX/api/v2/login"
if [[ -n "$LOGIN_CONTROLLER_ID" && -z "$OMADA_CONTROLLER_ID" ]]; then
  OMADA_CONTROLLER_ID="$LOGIN_CONTROLLER_ID"
  API_PREFIX="/$OMADA_CONTROLLER_ID"
  log "Controller ID detectado no login: $OMADA_CONTROLLER_ID"
fi

# precedência: manual > selected > nome
if [[ -n "$OMADA_SITE_ID" ]]; then
  if [[ ! "$OMADA_SITE_ID" =~ ^[a-fA-F0-9]{24,32}$ ]]; then
    if [[ "$MODE" == "discover" && "$OMADA_OUTPUT" == "json" ]]; then
      SITES_JSON='[]'
      emit_discover_json_and_exit false "OMADA_SITE_ID inválido. Use o ID hexadecimal do site (24 ou 32 caracteres), não o índice da linha."
    fi
    log "ERRO: OMADA_SITE_ID inválido: $OMADA_SITE_ID"
    log "Use o ID hexadecimal do site (24 ou 32 caracteres), não o índice da linha."
    exit 3
  fi
  SITE_ID="$OMADA_SITE_ID"
  SITE_PATH="manual (OMADA_SITE_ID)"
elif [[ -n "$OMADA_SELECTED_SITE_ID" ]]; then
  SITE_ID="$OMADA_SELECTED_SITE_ID"
  SITE_PATH="selected (OMADA_SELECTED_SITE_ID)"
fi

discover_sites

if [[ -z "$SITE_ID" ]]; then
  SITE_ID="$(choose_site_id "$SITES_JSON" "$OMADA_SITE_NAME")"
  [[ -n "$SITE_ID" && -z "$SITE_PATH" ]] && SITE_PATH="resolved by name"
fi

if [[ -n "$SITE_ID" ]]; then
  SITE_NAME_RESOLVED="$(find_site_name_by_id "$SITES_JSON" "$SITE_ID")"
fi

log "Sites endpoint: ${SITE_PATH:-não encontrado}"
if [[ -n "$SITE_ID" ]]; then
  log "Site selecionado ID: $SITE_ID"
  [[ -n "$SITE_NAME_RESOLVED" ]] && log "Site selecionado Nome: $SITE_NAME_RESOLVED"
else
  log "Site ID não identificado automaticamente (seguindo probe sem siteId)."
fi

if [[ -n "$SITE_ID" ]]; then
  call_api POST "/api/v2/sites/$SITE_ID/cmd/switch"
  SW_HTTP="$HTTP_CODE"
  SW_ERR="$(extract_error_code "$BODY")"
  if [[ "$SW_HTTP" == "200" && "$SW_ERR" == "0" ]]; then
    log "Switch para site executado com sucesso."
  else
    log "Aviso: switch para site retornou HTTP $SW_HTTP errorCode ${SW_ERR:-N/A}"
  fi
fi

if [[ "$MODE" == "discover" ]]; then
  if [[ "$OMADA_OUTPUT" == "json" ]]; then
    if [[ "$SITES_JSON" == "[]" ]]; then
      emit_discover_json_and_exit false "Não foi possível listar sites para este usuário/contexto."
    else
      emit_discover_json_and_exit true "Sites descobertos com sucesso."
    fi
  fi

  log
  log "Sites descobertos:"
  node -e '
  const sites = JSON.parse(process.argv[1] || "[]");
  if (!Array.isArray(sites) || sites.length === 0) {
    console.log("- nenhum");
  } else {
    for (const s of sites) console.log(`- ${s.name} (${s.id})`);
  }
  ' "$SITES_JSON"
  exit 0
fi

CANDIDATES=(
  "/setting/vpns"
  "/api/v2/remoteSites"
  "/api/v2/customer/sites"
  "/api/v2/current/user-popup"
  "/api/v2/views/switch"
  "/setting/wireguard"
  "/setting/wireguards"
  "/setting/vpn/wireguard"
  "/setting/vpn/wireguards"
  "/setting/wireguard/interfaces"
  "/setting/wireguard/peers"
  "/setting/vpns/wireguard"
  "/setting/vpn/wireguard/interfaces"
  "/setting/vpn/wireguard/peers"
)

if [[ -n "$SITE_ID" ]]; then
  CANDIDATES+=(
    "/api/v2/sites/$SITE_ID/cmd/switch"
    "/api/v2/sites/$SITE_ID/wireguard"
    "/api/v2/sites/$SITE_ID/wireguard/interfaces"
    "/api/v2/sites/$SITE_ID/wireguard/peers"
    "/api/v2/sites/$SITE_ID/vpn/wireguard"
    "/api/v2/sites/$SITE_ID/setting/wireguard"
  )
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="wireguard-output/api-probe"
mkdir -p "$OUT_DIR"
REPORT="$OUT_DIR/omada-wireguard-probe-$TIMESTAMP.txt"
GOOD_ENDPOINTS=()
WG_BASE_OK=""

{
  echo "Omada WireGuard API Probe"
  echo "Date: $(date)"
  echo "Base URL: $BASE_URL"
  echo "API Prefix: $API_PREFIX"
  echo "Controller ID: ${OMADA_CONTROLLER_ID:-$LOGIN_CONTROLLER_ID}"
  echo "Site ID: ${SITE_ID:-N/A}"
  echo "Site Name: ${SITE_NAME_RESOLVED:-N/A}"
  echo "Site Switch: HTTP ${SW_HTTP:-N/A} errorCode ${SW_ERR:-N/A}"
  echo
  printf '%-55s %-6s %-10s\n' "ENDPOINT" "HTTP" "errorCode"
  printf '%-55s %-6s %-10s\n' "--------" "----" "---------"

  for ep in "${CANDIDATES[@]}"; do
    method="GET"
    data=""
    [[ "$ep" == */cmd/switch ]] && method="POST"
    call_api "$method" "$ep" "$data"
    ec="$(extract_error_code "$BODY")"
    if [[ "$HTTP_CODE" == "200" && "$ec" == "0" ]]; then
      GOOD_ENDPOINTS+=("$ep")
      if [[ "$ep" == "/api/v2/sites/$SITE_ID/setting/wireguard" ]]; then
        WG_BASE_OK="$ep"
      fi
    fi
    printf '%-55s %-6s %-10s\n' "$ep" "$HTTP_CODE" "${ec:-}"
  done

  echo
  echo "Resumo"
  if [[ "${#GOOD_ENDPOINTS[@]}" -gt 0 ]]; then
    echo "- Endpoints com HTTP 200 + errorCode 0:"
    for ok_ep in "${GOOD_ENDPOINTS[@]}"; do
      echo "  - $ok_ep"
    done
  else
    echo "- Nenhum endpoint com errorCode 0 detectado."
  fi
  if [[ -n "$WG_BASE_OK" ]]; then
    echo "- Endpoint base WireGuard confirmado: $WG_BASE_OK"
    echo "- Próximo passo recomendado: inspecionar payload com scripts/inspect_wireguard_site_endpoint.sh"
  fi
} | tee "$REPORT"

log
log "Relatório salvo em: $REPORT"
if [[ -n "$WG_BASE_OK" ]]; then
  log "Próximo passo: rode scripts/inspect_wireguard_site_endpoint.sh com OMADA_SITE_ID para mapear payload de CREATE."
else
  log "Próximo passo: me envie esse relatório para eu travar os endpoints corretos de CREATE (interface/peer)."
fi
