#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <nome_servico_vpn_macos> [ip_roteador]"
  echo "Exemplo: $0 \"HomeContente\" 192.168.16.1"
  exit 1
fi

SERVICE_NAME="$1"
ROUTER_IP="${2:-192.168.16.1}"

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; }
info() { echo "[INFO] $1"; }

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

info "Verificando status da VPN: $SERVICE_NAME"
STATUS_RAW="$(scutil --nc status "$SERVICE_NAME" 2>&1 || true)"
echo "$STATUS_RAW" > "$TMP_DIR/status.txt"

if echo "$STATUS_RAW" | head -n1 | grep -q "Connected"; then
  pass "VPN conectada"
else
  fail "VPN não está conectada"
fi

info "Verificando rota default"
ROUTE_RAW="$(route -n get default 2>&1 || true)"
echo "$ROUTE_RAW" > "$TMP_DIR/route.txt"
if echo "$ROUTE_RAW" | grep -q "interface: utun"; then
  pass "Rota default está no túnel (utun)"
else
  fail "Rota default não está no túnel"
fi

info "Teste de DNS (google.com)"
DNS_RAW="$(dscacheutil -q host -a name google.com 2>&1 || true)"
echo "$DNS_RAW" > "$TMP_DIR/dns.txt"
if echo "$DNS_RAW" | grep -qi "ip_address"; then
  pass "DNS resolvendo"
else
  fail "DNS falhou"
fi

info "Teste de alcance LAN remota ($ROUTER_IP)"
PING_LAN="$(ping -c 3 -W 1500 "$ROUTER_IP" 2>&1 || true)"
echo "$PING_LAN" > "$TMP_DIR/ping_lan.txt"
if echo "$PING_LAN" | grep -q "0.0% packet loss\|1 packets received\|2 packets received\|3 packets received"; then
  pass "LAN remota acessível"
else
  fail "LAN remota sem resposta"
fi

info "Teste de internet por IPv4"
IP4_RAW="$(curl -4 -s --max-time 8 https://api.ipify.org 2>&1 || true)"
echo "$IP4_RAW" > "$TMP_DIR/ipify.txt"
if echo "$IP4_RAW" | rg -q '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  pass "Saída internet ok (IP público: $IP4_RAW)"
else
  fail "Sem saída de internet ou falha de DNS"
fi

echo
echo "Resumo rápido:"
echo "- Status: $(head -n1 "$TMP_DIR/status.txt")"
echo "- Default route: $(echo "$ROUTE_RAW" | awk -F': ' '/interface:/{print $2; exit}')"
echo "- DNS: $(echo "$DNS_RAW" | awk -F': ' '/ip_address/{print $2; exit}')"
echo "- IP público: $IP4_RAW"

echo
echo "Se houver FAIL, rode para diagnóstico adicional:"
echo "scutil --dns | sed -n '1,120p'"
echo "traceroute -n -m 5 -w 2 -q 1 -i utun8 1.1.1.1"
