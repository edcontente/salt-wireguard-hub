const HANDSHAKE_WINDOW_MS = 15 * 60 * 1000;

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function slugifyName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function parseHandshakeAgeMs(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'never') return null;
  const parts = raw.match(/(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days)/g) || [];
  if (!parts.length) return null;
  let totalMs = 0;
  for (const part of parts) {
    const match = part.match(/(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days)/);
    if (!match) continue;
    const amount = Number(match[1]);
    const unit = match[2];
    if (unit.startsWith('second')) totalMs += amount * 1000;
    else if (unit.startsWith('minute')) totalMs += amount * 60 * 1000;
    else if (unit.startsWith('hour')) totalMs += amount * 60 * 60 * 1000;
    else if (unit.startsWith('day')) totalMs += amount * 24 * 60 * 60 * 1000;
  }
  return totalMs || null;
}

function parseWgShowPeers(text, options = {}) {
  const nowMs = Number(options.nowMs || Date.now());
  const clean = stripAnsi(text);
  const lines = clean.split(/\r?\n/);
  const peers = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    current.lastHandshakeAtMs = current.handshakeAgeMs == null ? null : nowMs - current.handshakeAgeMs;
    peers.push(current);
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('peer:')) {
      flush();
      current = {
        publicKey: trimmed.slice(5).trim(),
        endpoint: '',
        allowedIps: [],
        handshakeAgo: '',
        handshakeAgeMs: null,
        transferRx: '',
        transferTx: '',
        persistentKeepalive: null,
      };
      continue;
    }
    if (!current) continue;
    if (trimmed.startsWith('endpoint:')) {
      current.endpoint = trimmed.slice('endpoint:'.length).trim();
      continue;
    }
    if (trimmed.startsWith('allowed ips:')) {
      current.allowedIps = trimmed
        .slice('allowed ips:'.length)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }
    if (trimmed.startsWith('latest handshake:')) {
      current.handshakeAgo = trimmed.slice('latest handshake:'.length).trim();
      current.handshakeAgeMs = parseHandshakeAgeMs(current.handshakeAgo);
      continue;
    }
    if (trimmed.startsWith('transfer:')) {
      const transfer = trimmed.slice('transfer:'.length).trim();
      const match = transfer.match(/^(.+?) received,\s+(.+?) sent$/i);
      if (match) {
        current.transferRx = match[1].trim();
        current.transferTx = match[2].trim();
      }
      continue;
    }
    if (trimmed.startsWith('persistent keepalive:')) {
      const match = trimmed.match(/every\s+(\d+)\s+seconds?/i);
      if (match) current.persistentKeepalive = Number(match[1]);
    }
  }

  flush();
  return peers;
}

function summarizeCards(cards) {
  return {
    totalSites: cards.length,
    onlineSites: cards.filter((card) => card.handshakeState === 'online').length,
    problemSites: cards.filter((card) => card.handshakeState !== 'online').length,
  };
}

function buildCardSections(card = {}) {
  return {
    summaryItems: [
      { label: 'Túnel', value: String(card.tunnelIp || '-') },
      { label: 'Handshake', value: String(card.lastHandshakeAgo || '-') },
      { label: 'Deploy', value: String(card.deploymentLabel || '-') },
      { label: 'Técnicos', value: String(card.technicianCount ?? 0) },
    ],
    detailItems: [
      { label: 'Interface', value: String(card.interfaceName || '-') },
      { label: 'Peer do Hub', value: String(card.peerName || '-') },
      { label: 'Endpoint do Hub', value: String(card.hubEndpoint || '-') },
      { label: 'Endpoint visto no Hub', value: String(card.peerEndpoint || '-') },
      { label: 'Tráfego RX/TX', value: String(card.transferSummary || '-') },
      { label: 'Keepalive', value: String(card.keepaliveLabel || '-') },
      { label: 'Próxima ação', value: String(card.recommendedAction || '-') },
    ],
  };
}

function buildDashboardSites(input = {}) {
  const sites = Array.isArray(input.sites) ? input.sites : [];
  const tunnelAllocations = Array.isArray(input.tunnelAllocations) ? input.tunnelAllocations : [];
  const hubPeers = Array.isArray(input.hubPeers) ? input.hubPeers : [];
  const technicianAllocations = Array.isArray(input.technicianAllocations) ? input.technicianAllocations : [];
  const hubEndpoint = String(input.hubEndpoint || '');
  const handshakeWindowMs = Number(input.handshakeWindowMs || HANDSHAKE_WINDOW_MS);

  const siteTunnelMap = new Map();
  for (const allocation of tunnelAllocations) {
    if (String(allocation.status || 'active') !== 'active') continue;
    siteTunnelMap.set(String(allocation.siteId), allocation);
  }

  const peerByAllowedIp = new Map();
  for (const peer of hubPeers) {
    for (const allowed of peer.allowedIps || []) {
      peerByAllowedIp.set(String(allowed), peer);
      peerByAllowedIp.set(String(allowed).replace(/\/32$/, ''), peer);
    }
  }

  const cards = sites.map((site) => {
    const allocation = siteTunnelMap.get(String(site.id));
    const tunnelIp = allocation?.tunnelIp || '';
    const peer = tunnelIp ? (peerByAllowedIp.get(`${tunnelIp}/32`) || peerByAllowedIp.get(tunnelIp)) : null;
    const techCount = technicianAllocations.filter((item) => String(item.siteId) === String(site.id) && String(item.status || 'active') === 'active').length;

    let deploymentState = 'pending';
    let deploymentLabel = 'Pendente de conexão';
    let handshakeState = 'pending';
    let handshakeLabel = 'Ainda não conectado';
    let issue = 'Este site ainda não foi conectado ao hub.';
    let recommendedAction = 'Provisionar spoke e conectar ao hub';
    let connectActionEnabled = true;
    let credentialActionEnabled = false;
    let repairActionEnabled = false;

    if (allocation && !peer) {
      deploymentState = 'partial';
      deploymentLabel = 'Falha de conexão';
      handshakeState = 'warning';
      handshakeLabel = 'Peer ausente no hub';
      issue = 'O site está no IPAM, mas ainda não existe no wg0 do hub.';
      recommendedAction = 'Reexecutar a conexão com o hub';
      repairActionEnabled = true;
    }

    if (allocation && peer) {
      deploymentState = 'connected';
      deploymentLabel = 'Conectado';
      connectActionEnabled = false;
      credentialActionEnabled = true;
      if (peer.handshakeAgeMs != null && peer.handshakeAgeMs <= handshakeWindowMs) {
        handshakeState = 'online';
        handshakeLabel = 'Handshake recente';
        issue = '';
        recommendedAction = 'Pronto para acesso técnico';
      } else {
        handshakeState = 'stale';
        handshakeLabel = 'Sem handshake recente';
        issue = 'O peer existe no hub, mas não houve handshake dentro da janela configurada.';
        recommendedAction = 'Validar energia, internet ou NAT do cliente';
        repairActionEnabled = true;
      }
    }

    return {
      siteId: String(site.id),
      siteName: String(site.name),
      status: handshakeState,
      statusLabel: handshakeLabel,
      deploymentState,
      deploymentLabel,
      handshakeState,
      handshakeLabel,
      connectActionEnabled,
      credentialActionEnabled,
      repairActionEnabled,
      issue,
      recommendedAction,
      tunnelIp,
      peerEndpoint: peer?.endpoint || '',
      lastHandshakeAgo: peer?.handshakeAgo || '',
      lastHandshakeAtMs: peer?.lastHandshakeAtMs ?? null,
      transferRx: peer?.transferRx || '',
      transferTx: peer?.transferTx || '',
      transferSummary: peer?.transferRx || peer?.transferTx
        ? `RX ${peer?.transferRx || '-'} | TX ${peer?.transferTx || '-'}`
        : '',
      keepaliveSeconds: peer?.persistentKeepalive ?? null,
      keepaliveLabel: peer?.persistentKeepalive != null ? `${peer.persistentKeepalive}s` : '',
      interfaceName: 'HUB-SPOKE',
      peerName: 'HUB-UPLINK',
      hubEndpoint,
      technicianCount: techCount,
    };
  }).sort((a, b) => {
    const rank = { connected: 0, partial: 1, pending: 2 };
    return (rank[a.deploymentState] - rank[b.deploymentState]) || a.siteName.localeCompare(b.siteName, 'pt-BR');
  });

  return { cards, summary: summarizeCards(cards) };
}

function allocateTechnicianRecord(input = {}) {
  const siteId = String(input.siteId || '');
  const siteName = String(input.siteName || '');
  const technicianName = String(input.technicianName || '').trim();
  const technicianSlug = slugifyName(technicianName);
  const existingAllocations = Array.isArray(input.existingAllocations) ? input.existingAllocations : [];
  const siteTunnelAllocations = Array.isArray(input.siteTunnelAllocations) ? input.siteTunnelAllocations : [];
  const nowIso = String(input.nowIso || new Date().toISOString());

  const existing = existingAllocations.find((item) =>
    String(item.siteId) === siteId && String(item.technicianSlug) === technicianSlug && String(item.status || 'active') === 'active'
  );
  if (existing) return { reused: true, record: existing };

  const used = new Set();
  for (const allocation of existingAllocations) {
    const match = String(allocation.address || '').match(/^10\.200\.0\.(\d{1,3})\/32$/);
    if (match) used.add(Number(match[1]));
  }
  for (const allocation of siteTunnelAllocations) {
    const match = String(allocation.tunnelIp || '').match(/^10\.200\.0\.(\d{1,3})$/);
    if (match) used.add(Number(match[1]));
  }

  let chosen = 0;
  for (let octet = 200; octet <= 250; octet += 1) {
    if (!used.has(octet)) {
      chosen = octet;
      break;
    }
  }
  if (!chosen) throw new Error('Sem IP livre no pool de técnicos (10.200.0.200-250).');

  return {
    reused: false,
    record: {
      siteId,
      siteName,
      technicianName,
      technicianSlug,
      address: `10.200.0.${chosen}/32`,
      status: 'active',
      updatedAt: nowIso,
    },
  };
}

function buildTechnicianConfig(input = {}) {
  const lines = [
    '# WireGuard Dashboard',
    `# Site: ${String(input.siteName || '')}`,
    `# Tecnico: ${String(input.technicianName || '')}`,
    '[Interface]',
    `PrivateKey = ${String(input.privateKey || '')}`,
    `Address = ${String(input.address || '')}`,
  ];

  if (input.dns) lines.push(`DNS = ${String(input.dns)}`);
  if (input.mtu) lines.push(`MTU = ${String(input.mtu)}`);

  lines.push('', '[Peer]');
  lines.push(`PublicKey = ${String(input.hubPublicKey || '')}`);
  lines.push(`Endpoint = ${String(input.hubEndpoint || '')}`);
  lines.push(`AllowedIPs = 10.200.0.1/32, ${String(input.siteTunnelIp || '')}/32`);
  if (input.keepalive) lines.push(`PersistentKeepalive = ${String(input.keepalive)}`);
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  HANDSHAKE_WINDOW_MS,
  slugifyName,
  parseWgShowPeers,
  buildDashboardSites,
  buildCardSections,
  allocateTechnicianRecord,
  buildTechnicianConfig,
  stripAnsi,
};
