#!/usr/bin/env bash

wireguard_peer_endpoint_payload_variants() {
  local base_payload="$1"
  local full_endpoint="$2"
  local endpoint_host="$3"
  local endpoint_port="$4"

  node - <<'NODE' "$base_payload" "$full_endpoint" "$endpoint_host" "$endpoint_port"
const [baseRaw, fullEndpoint, endpointHost, endpointPortRaw] = process.argv.slice(2);

let basePayload = {};
try {
  basePayload = JSON.parse(baseRaw || '{}');
} catch (error) {
  console.error(`Invalid base payload JSON: ${error.message}`);
  process.exit(1);
}

const numericPort = Number.parseInt(endpointPortRaw, 10);
const portNumber = Number.isNaN(numericPort) ? endpointPortRaw : numericPort;
const portString = String(endpointPortRaw ?? '');

const variants = [
  { endPoint: fullEndpoint },
  { endPoint: endpointHost, endPointPort: portNumber },
  { endPoint: endpointHost, endPointPort: portString },
  { endpoint: fullEndpoint },
  { endpoint: endpointHost, endpointPort: portNumber },
  { endPoint: endpointHost, endPointPort: portNumber, endpoint: endpointHost, endpointPort: portNumber },
  { endPoint: endpointHost, endPointPort: portString, endpoint: endpointHost, endpointPort: portString },
  { endPoint: fullEndpoint, endpoint: fullEndpoint }
];

const seen = new Set();
for (const extra of variants) {
  const merged = { ...basePayload, ...extra };
  const key = JSON.stringify(merged);
  if (seen.has(key)) continue;
  seen.add(key);
  process.stdout.write(`${key}\n`);
}
NODE
}
