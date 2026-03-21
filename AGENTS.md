# Omada MCP Usage

## Installed MCP
The Omada MCP used in this workspace is `realtydev/omada-mcp`, accessible via tools named `mcp__omada__*`.

## Operating Rule
Use Omada MCP tools directly (no intermediary agent), unless the task is a multi-step workflow that clearly requires orchestration.

## Tool Coverage
Available capabilities include:
- Sites/devices (`listSites`, `listDevices`, `getDevice`, `searchDevices`, `rebootDevice`)
- Clients (`listClients`, `getClient`, `blockClient`, `unblockClient`, `reconnectClient`)
- Switch ports (`getSwitchPorts`, `setSwitchPortStatus`, `setSwitchPortPoe`, `setSwitchPortProfile`)
- Firewall (`listFirewallAcls`, `createFirewallAcl`, `deleteFirewallAcl`, `getFirewallSetting`)
- Wi-Fi (`getSsidList`, `getSsidDetail`, `getWlanGroupList`)
- Networks (`getLanNetworkList`, `createLanNetwork`, `getLanProfileList`)
- Monitoring (`listEvents`, `listLogs`, `listDevicesStats`, `listMostActiveClients`)
- Firmware (`getFirmwareDetails`, `startFirmwareUpgrade`)

## Safety Defaults
- Do not run destructive actions (reboot, block, ACL delete) without explicit confirmation.
- For config changes, fetch current state first and show a short diff/plan before writing.
- Prefer idempotent updates and avoid duplicate objects (ACLs, VLANs, SSIDs).
