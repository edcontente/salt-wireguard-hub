const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseWgShowPeers,
  buildDashboardSites,
  buildCardSections,
  allocateTechnicianRecord,
  buildTechnicianConfig,
  slugifyName,
} = require('../scripts/lib/wireguard_dashboard');

const sampleWgShow = `interface: wg0
  public key: HUBPUB
  private key: (hidden)
  listening port: 51821

peer: SITE-ONLINE
  endpoint: 179.180.93.154:51822
  allowed ips: 10.200.0.12/32
  latest handshake: 12 seconds ago
  transfer: 180 B received, 124 B sent
  persistent keepalive: every 25 seconds

peer: SITE-STALE
  endpoint: 191.10.44.56:51822
  allowed ips: 10.200.0.10/32
  latest handshake: 8 hours, 57 minutes, 28 seconds ago
  transfer: 7.89 KiB received, 723.77 KiB sent
  persistent keepalive: every 25 seconds
`;

test('parseWgShowPeers extracts endpoint, allowed ip and handshake age', () => {
  const peers = parseWgShowPeers(sampleWgShow, { nowMs: Date.UTC(2026, 2, 21, 12, 0, 0) });
  assert.equal(peers.length, 2);
  assert.equal(peers[0].publicKey, 'SITE-ONLINE');
  assert.equal(peers[0].endpoint, '179.180.93.154:51822');
  assert.equal(peers[0].allowedIps[0], '10.200.0.12/32');
  assert.equal(peers[0].handshakeAgeMs, 12_000);
  assert.equal(peers[0].transferRx, '180 B');
  assert.equal(peers[0].transferTx, '124 B');
  assert.equal(peers[0].persistentKeepalive, 25);
  assert.equal(peers[1].handshakeAgeMs, ((8 * 60 + 57) * 60 + 28) * 1000);
});

test('buildDashboardSites lists all sites and separates connection state from handshake health', () => {
  const cards = buildDashboardSites({
    sites: [
      { id: 'site-1', name: 'Luana e Joelton' },
      { id: 'site-2', name: 'Edgard Contente' },
      { id: 'site-3', name: 'Site Sem Hub' },
      { id: 'site-4', name: 'Site Novo' },
    ],
    tunnelAllocations: [
      { siteId: 'site-1', siteName: 'Luana e Joelton', tunnelIp: '10.200.0.12', status: 'active' },
      { siteId: 'site-2', siteName: 'Edgard Contente', tunnelIp: '10.200.0.10', status: 'active' },
      { siteId: 'site-3', siteName: 'Site Sem Hub', tunnelIp: '10.200.0.13', status: 'active' },
    ],
    hubPeers: parseWgShowPeers(sampleWgShow, { nowMs: Date.UTC(2026, 2, 21, 12, 0, 0) }),
    technicianAllocations: [
      { siteId: 'site-1', technicianSlug: 'joao', address: '10.200.0.200/32', status: 'active' },
      { siteId: 'site-1', technicianSlug: 'maria', address: '10.200.0.201/32', status: 'active' },
    ],
    hubEndpoint: '191.248.70.82:51821',
    handshakeWindowMs: 15 * 60 * 1000,
  });

  assert.equal(cards.summary.totalSites, 4);
  assert.equal(cards.summary.onlineSites, 1);
  assert.equal(cards.summary.problemSites, 3);

  const luana = cards.cards.find((card) => card.siteId === 'site-1');
  const edgard = cards.cards.find((card) => card.siteId === 'site-2');
  const semHub = cards.cards.find((card) => card.siteId === 'site-3');
  const novo = cards.cards.find((card) => card.siteId === 'site-4');

  assert.equal(luana.deploymentState, 'connected');
  assert.equal(luana.handshakeState, 'online');
  assert.equal(luana.connectActionEnabled, false);
  assert.equal(luana.credentialActionEnabled, true);
  assert.equal(luana.repairActionEnabled, false);
  assert.equal(luana.technicianCount, 2);
  assert.equal(luana.transferSummary, 'RX 180 B | TX 124 B');
  assert.equal(luana.keepaliveLabel, '25s');
  assert.equal(luana.recommendedAction, 'Pronto para acesso técnico');

  assert.equal(edgard.deploymentState, 'connected');
  assert.equal(edgard.handshakeState, 'stale');
  assert.equal(edgard.connectActionEnabled, false);
  assert.equal(edgard.credentialActionEnabled, true);
  assert.equal(edgard.repairActionEnabled, true);
  assert.equal(edgard.recommendedAction, 'Validar energia, internet ou NAT do cliente');

  assert.equal(semHub.deploymentState, 'partial');
  assert.equal(semHub.connectActionEnabled, true);
  assert.equal(semHub.credentialActionEnabled, false);
  assert.equal(semHub.repairActionEnabled, true);
  assert.equal(semHub.recommendedAction, 'Reexecutar a conexão com o hub');

  assert.equal(novo.deploymentState, 'pending');
  assert.equal(novo.handshakeState, 'pending');
  assert.equal(novo.connectActionEnabled, true);
  assert.equal(novo.credentialActionEnabled, false);
  assert.equal(novo.repairActionEnabled, false);
  assert.equal(novo.recommendedAction, 'Provisionar spoke e conectar ao hub');
});

test('buildCardSections creates compact summary and expandable details', () => {
  const sections = buildCardSections({
    tunnelIp: '10.200.0.13',
    lastHandshakeAgo: '23 seconds ago',
    deploymentLabel: 'Conectado',
    technicianCount: 2,
    interfaceName: 'HUB-SPOKE',
    peerName: 'HUB-UPLINK',
    hubEndpoint: '191.248.70.82:51821',
    peerEndpoint: '179.176.233.97:51822',
    transferSummary: 'RX 700 B | TX 340 B',
    keepaliveLabel: '25s',
    recommendedAction: 'Pronto para acesso técnico',
  });

  assert.deepEqual(sections.summaryItems, [
    { label: 'Túnel', value: '10.200.0.13' },
    { label: 'Handshake', value: '23 seconds ago' },
    { label: 'Deploy', value: 'Conectado' },
    { label: 'Técnicos', value: '2' },
  ]);
  assert.deepEqual(sections.detailItems, [
    { label: 'Interface', value: 'HUB-SPOKE' },
    { label: 'Peer do Hub', value: 'HUB-UPLINK' },
    { label: 'Endpoint do Hub', value: '191.248.70.82:51821' },
    { label: 'Endpoint visto no Hub', value: '179.176.233.97:51822' },
    { label: 'Tráfego RX/TX', value: 'RX 700 B | TX 340 B' },
    { label: 'Keepalive', value: '25s' },
    { label: 'Próxima ação', value: 'Pronto para acesso técnico' },
  ]);
});

test('allocateTechnicianRecord reuses existing record and allocates from reserved pool', () => {
  const reused = allocateTechnicianRecord({
    siteId: 'site-1',
    siteName: 'Luana e Joelton',
    technicianName: 'Joao MacBook',
    existingAllocations: [
      { siteId: 'site-1', siteName: 'Luana e Joelton', technicianName: 'Joao MacBook', technicianSlug: 'joao-macbook', address: '10.200.0.200/32', status: 'active' },
    ],
    siteTunnelAllocations: [
      { siteId: 'site-1', tunnelIp: '10.200.0.12', status: 'active' },
    ],
  });
  assert.equal(reused.reused, true);
  assert.equal(reused.record.address, '10.200.0.200/32');

  const fresh = allocateTechnicianRecord({
    siteId: 'site-2',
    siteName: 'Edgard Contente',
    technicianName: 'Maria iPhone',
    existingAllocations: [
      { siteId: 'site-1', siteName: 'Luana e Joelton', technicianName: 'Joao MacBook', technicianSlug: 'joao-macbook', address: '10.200.0.200/32', status: 'active' },
    ],
    siteTunnelAllocations: [
      { siteId: 'site-1', tunnelIp: '10.200.0.12', status: 'active' },
      { siteId: 'site-2', tunnelIp: '10.200.0.10', status: 'active' },
    ],
    nowIso: '2026-03-21T12:00:00.000Z',
  });

  assert.equal(fresh.reused, false);
  assert.equal(fresh.record.address, '10.200.0.201/32');
  assert.equal(fresh.record.technicianSlug, 'maria-iphone');
});

test('buildTechnicianConfig limits AllowedIPs to hub and selected site', () => {
  const conf = buildTechnicianConfig({
    siteName: 'Luana e Joelton',
    technicianName: 'Joao MacBook',
    privateKey: 'CLIENT_PRIV',
    address: '10.200.0.200/32',
    dns: '1.1.1.1',
    mtu: 1280,
    hubPublicKey: 'HUB_PUB',
    hubEndpoint: '191.248.70.82:51821',
    siteTunnelIp: '10.200.0.12',
    keepalive: 25,
  });

  assert.match(conf, /Address = 10\.200\.0\.200\/32/);
  assert.match(conf, /Endpoint = 191\.248\.70\.82:51821/);
  assert.match(conf, /AllowedIPs = 10\.200\.0\.1\/32, 10\.200\.0\.12\/32/);
  assert.match(conf, /# Site: Luana e Joelton/);
});

test('slugifyName normalizes readable labels', () => {
  assert.equal(slugifyName('Luana e Joelton'), 'luana-e-joelton');
  assert.equal(slugifyName(' João  Técnico #1 '), 'joao-tecnico-1');
});
