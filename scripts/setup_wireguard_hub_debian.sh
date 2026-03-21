#!/usr/bin/env bash
set -euo pipefail

# Bootstrap de hub WireGuard em Debian/Ubuntu.
# Uso (como root):
#   HUB_IF=eth0 HUB_WG_IF=wg0 HUB_WG_ADDR=10.200.0.1/24 HUB_WG_PORT=51820 ./scripts/setup_wireguard_hub_debian.sh

need_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "Execute como root: sudo $0"
    exit 1
  fi
}

detect_iface() {
  ip route show default 2>/dev/null | awk '/default/ {print $5; exit}'
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Comando obrigatório ausente: $1"
    exit 1
  }
}

need_root
need_cmd apt-get
need_cmd ip
need_cmd systemctl

HUB_IF="${HUB_IF:-$(detect_iface)}"
HUB_WG_IF="${HUB_WG_IF:-wg0}"
HUB_WG_ADDR="${HUB_WG_ADDR:-10.200.0.1/24}"
HUB_WG_PORT="${HUB_WG_PORT:-51820}"
HUB_CONF="/etc/wireguard/${HUB_WG_IF}.conf"
SYSCTL_FILE="/etc/sysctl.d/99-wireguard-hub.conf"
NFT_FILE="/etc/nftables.d/wireguard-hub.nft"

if [[ -z "${HUB_IF:-}" ]]; then
  echo "Não consegui detectar interface WAN/LAN principal. Defina HUB_IF manualmente."
  exit 1
fi

echo "[1/6] Instalando pacotes..."
apt-get update -y
apt-get install -y wireguard wireguard-tools nftables qrencode
need_cmd wg

echo "[2/6] Gerando chaves do hub..."
mkdir -p /etc/wireguard
chmod 700 /etc/wireguard
if [[ ! -f /etc/wireguard/privatekey ]]; then
  umask 077
  wg genkey | tee /etc/wireguard/privatekey | wg pubkey >/etc/wireguard/publickey
fi
HUB_PRIV_KEY="$(cat /etc/wireguard/privatekey)"
HUB_PUB_KEY="$(cat /etc/wireguard/publickey)"

echo "[3/6] Escrevendo configuração base ${HUB_CONF}..."
if [[ ! -f "$HUB_CONF" ]]; then
  cat >"$HUB_CONF" <<EOF
[Interface]
Address = $HUB_WG_ADDR
ListenPort = $HUB_WG_PORT
PrivateKey = $HUB_PRIV_KEY

# Peers serão adicionados abaixo.
EOF
  chmod 600 "$HUB_CONF"
fi

echo "[4/6] Habilitando IP forwarding..."
cat >"$SYSCTL_FILE" <<EOF
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
EOF
sysctl --system >/dev/null

echo "[5/6] Configurando NAT/forward no nftables..."
mkdir -p /etc/nftables.d
cat >"$NFT_FILE" <<EOF
table inet wg_hub {
  chain forward {
    type filter hook forward priority 0; policy drop;
    ct state established,related accept
    iifname "$HUB_WG_IF" oifname "$HUB_IF" accept
    iifname "$HUB_IF" oifname "$HUB_WG_IF" ct state established,related accept
  }

  chain postrouting {
    type nat hook postrouting priority srcnat; policy accept;
    oifname "$HUB_IF" ip saddr 10.200.0.0/24 masquerade
  }
}
EOF
if [[ ! -f /etc/nftables.conf ]]; then
  cat >/etc/nftables.conf <<'EOF'
#!/usr/sbin/nft -f
flush ruleset
include "/etc/nftables.d/*.nft"
EOF
elif ! grep -Fq 'include "/etc/nftables.d/*.nft"' /etc/nftables.conf; then
  printf '\ninclude "/etc/nftables.d/*.nft"\n' >>/etc/nftables.conf
fi
nft -f /etc/nftables.conf
systemctl enable --now nftables >/dev/null

echo "[6/6] Ativando serviço WireGuard..."
systemctl enable "wg-quick@${HUB_WG_IF}" >/dev/null
systemctl restart "wg-quick@${HUB_WG_IF}"

echo
echo "Hub WireGuard pronto."
echo "- Interface uplink: $HUB_IF"
echo "- Interface WG: $HUB_WG_IF"
echo "- Rede WG: $HUB_WG_ADDR"
echo "- Porta UDP: $HUB_WG_PORT"
echo "- PublicKey hub: $HUB_PUB_KEY"
echo
echo "Próximos passos:"
echo "1) No roteador central, encaminhe UDP ${HUB_WG_PORT} para este host."
echo "2) Adicione peers em ${HUB_CONF} e rode: systemctl restart wg-quick@${HUB_WG_IF}"
echo "3) Verifique: wg show && nft list ruleset | sed -n '1,220p'"
