#!/usr/bin/env bash
set -euo pipefail

WG_IF="${WG_IF:-wg0}"
LAN_IF="${LAN_IF:-eth0}"
WG_NET="${WG_NET:-10.90.0.0/24}"
LAN_NET="${LAN_NET:-192.168.1.0/24}"

need_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "Execute como root: sudo $0"
    exit 1
  fi
}

write_nft_rules() {
  cat >/etc/nftables.d/wg-hub-lan.nft <<EOF_RULES
table ip wg_hub {
  chain forward {
    type filter hook forward priority 0; policy accept;
    iifname "$WG_IF" oifname "$LAN_IF" ip saddr $WG_NET ip daddr $LAN_NET accept
    iifname "$LAN_IF" oifname "$WG_IF" ip saddr $LAN_NET ip daddr $WG_NET ct state related,established accept
  }

  chain postrouting {
    type nat hook postrouting priority 100; policy accept;
    oifname "$LAN_IF" ip saddr $WG_NET ip daddr $LAN_NET masquerade
  }
}
EOF_RULES
}

ensure_nftables_conf() {
  if [[ ! -f /etc/nftables.conf ]]; then
    cat >/etc/nftables.conf <<'EOF_NFT'
#!/usr/sbin/nft -f
flush ruleset

include "/etc/nftables.d/*.nft"
EOF_NFT
  elif ! grep -Fq 'include "/etc/nftables.d/*.nft"' /etc/nftables.conf; then
    printf '\ninclude "/etc/nftables.d/*.nft"\n' >>/etc/nftables.conf
  fi
}

enable_forwarding() {
  mkdir -p /etc/sysctl.d
  printf 'net.ipv4.ip_forward=1\n' >/etc/sysctl.d/99-wireguard.conf
  sysctl --system >/dev/null
}

apply_rules() {
  mkdir -p /etc/nftables.d
  write_nft_rules
  ensure_nftables_conf
  nft -f /etc/nftables.conf
  systemctl enable nftables >/dev/null 2>&1 || true
  systemctl restart nftables
}

show_status() {
  echo "Forwarding:"
  sysctl net.ipv4.ip_forward
  echo
  echo "nftables:"
  nft list table ip wg_hub
}

need_root
enable_forwarding
apply_rules
show_status
