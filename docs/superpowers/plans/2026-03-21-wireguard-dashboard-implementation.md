# WireGuard Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma nova tela de dashboard para monitorar sites WireGuard do hub, mostrar handshake recente em 15 minutos e gerar credenciais individuais por técnico com download de `.conf` e QR code.

**Architecture:** Vamos preservar a tela atual em `scripts/wireguard_gui.js` e acrescentar uma rota nova de dashboard alimentada por um módulo auxiliar com funções puras testáveis. O dashboard vai combinar cache local de sites/IPAM, estado vivo do hub via `wg show` no Ubuntu e um banco local de credenciais por técnico para gerar arquivos WireGuard e sincronizar peers no hub.

**Tech Stack:** Node.js padrão (`http`, `fs`, `child_process`, `node:test`), shell/expect para SSH no hub Ubuntu, HTML/CSS/JS server-rendered.

---

### Task 1: Extrair helpers testáveis do dashboard

**Files:**
- Create: `scripts/lib/wireguard_dashboard.js`
- Create: `tests/wireguard_dashboard.test.js`
- Modify: `scripts/wireguard_gui.js`

- [ ] **Step 1: Write the failing test**

Criar testes cobrindo:
- parsing do `wg show`
- classificação `online/stale/warning` com janela de 15 minutos
- geração do `.conf` por técnico com `AllowedIPs` restrito ao site/hub

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/wireguard_dashboard.test.js`
Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Write minimal implementation**

Criar `scripts/lib/wireguard_dashboard.js` com funções puras para:
- sanitizar nomes/slugs
- parsear peers do `wg show`
- montar status de cada site
- gerar conteúdo do `.conf`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/wireguard_dashboard.test.js`
Expected: PASS.

### Task 2: Persistência e reconciliação de credenciais dos técnicos

**Files:**
- Create: `scripts/lib/hub_ssh.js`
- Create: `wireguard-output/dashboard/.gitkeep`
- Modify: `scripts/wireguard_gui.js`
- Test: `tests/wireguard_dashboard.test.js`

- [ ] **Step 1: Write the failing test**

Adicionar teste para alocação determinística de IP do técnico e para reuso da credencial existente do mesmo técnico no mesmo site.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/wireguard_dashboard.test.js`
Expected: FAIL no helper de persistência/alocação.

- [ ] **Step 3: Write minimal implementation**

Implementar helpers que:
- leem/escrevem `wireguard-output/dashboard/technician_allocations.json`
- escolhem IPs do pool de técnicos
- executam reconciliação idempotente do peer no hub via SSH/expect
- geram arquivo `.conf` em `wireguard-output/dashboard/configs/<site>/<tecnico>.conf`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/wireguard_dashboard.test.js`
Expected: PASS.

### Task 3: Nova rota e HTML do dashboard

**Files:**
- Modify: `scripts/wireguard_gui.js`
- Test: `tests/wireguard_dashboard.test.js`

- [ ] **Step 1: Write the failing test**

Adicionar teste simples para o renderer do dashboard ou, se mantido inline, para funções de view que gerem:
- métricas do topo
- cards por site
- seção de geração/download/QR

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/wireguard_dashboard.test.js`
Expected: FAIL até o renderer existir.

- [ ] **Step 3: Write minimal implementation**

Atualizar o servidor para:
- manter `/` como helper legado
- expor `/dashboard`
- expor `POST /run/dashboard-refresh`
- expor `POST /run/dashboard-generate-tech`
- expor `GET /download/tech-conf?...`
- usar layout branco com contraste alto e cards por site

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/wireguard_dashboard.test.js`
Expected: PASS.

### Task 4: Verificação integrada da interface

**Files:**
- Modify: `scripts/wireguard_gui.js`
- Modify: `scripts/lib/wireguard_dashboard.js`
- Modify: `scripts/lib/hub_ssh.js`

- [ ] **Step 1: Run syntax and test verification**

Run:
- `node --test tests/wireguard_dashboard.test.js`
- `node --check scripts/wireguard_gui.js`

Expected: tudo verde.

- [ ] **Step 2: Start local server and verify dashboard**

Run: `WG_GUI_PORT=8787 node scripts/wireguard_gui.js`
Expected: servidor iniciando sem erro.

- [ ] **Step 3: Validate live flows**

Verificar manualmente:
- `/dashboard` carrega com métricas
- cards mostram `Edgard Contente`, `Everton Lima`, `Luana e Joelton`
- `Luana e Joelton` aparece com handshake recente
- gerar credencial cria `.conf`, registra peer no hub e mostra QR

- [ ] **Step 4: Commit**

```bash
git add scripts/wireguard_gui.js scripts/lib/wireguard_dashboard.js scripts/lib/hub_ssh.js tests/wireguard_dashboard.test.js docs/superpowers/plans/2026-03-21-wireguard-dashboard-implementation.md wireguard-output/dashboard/.gitkeep
git commit -m "feat: add wireguard site dashboard"
```
