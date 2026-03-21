#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/lib/wireguard_peer_payloads.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_variant() {
  local expected_js="$1"
  shift
  local variant
  for variant in "$@"; do
    if node -e "
      const payload = JSON.parse(process.argv[1]);
      const ok = (() => { ${expected_js} })();
      process.exit(ok ? 0 : 1);
    " "$variant"; then
      return 0
    fi
  done
  fail "Nenhuma variante atendeu a regra: $expected_js"
}

base_payload='{"name":"HUB-UPLINK","publicKey":"abc","allowAddress":["10.200.0.1/32"],"keepAlive":25}'
mapfile -t variants < <(
  wireguard_peer_endpoint_payload_variants \
    "$base_payload" \
    "vpn.example.com:51821" \
    "vpn.example.com" \
    "51821"
)

[[ "${#variants[@]}" -ge 6 ]] || fail "Esperava ao menos 6 variantes, recebi ${#variants[@]}"

assert_variant '
  return payload.endPoint === "vpn.example.com:51821" &&
    payload.name === "HUB-UPLINK" &&
    payload.keepAlive === 25;
' "${variants[@]}"

assert_variant '
  return payload.endPoint === "vpn.example.com" &&
    payload.endPointPort === 51821;
' "${variants[@]}"

assert_variant '
  return payload.endPoint === "vpn.example.com" &&
    payload.endPointPort === "51821";
' "${variants[@]}"

assert_variant '
  return payload.endpoint === "vpn.example.com:51821";
' "${variants[@]}"

assert_variant '
  return payload.endpoint === "vpn.example.com" &&
    payload.endpointPort === 51821;
' "${variants[@]}"

assert_variant '
  return payload.endPoint === "vpn.example.com" &&
    payload.endPointPort === 51821 &&
    payload.endpoint === "vpn.example.com" &&
    payload.endpointPort === 51821;
' "${variants[@]}"

echo "ok"
