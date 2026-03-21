# Plano de Implantação — Túneis VPN WireGuard para Operação de Clientes

Este plano replica o modelo hub-and-spoke do relatório que você compartilhou, mas adaptado ao que já existe neste repositório.

## 1) O que você já tem pronto neste projeto

- Provisionamento WireGuard em site Omada: `scripts/provision_wireguard_omada.sh`
- Ativação/desativação de sessão por site (TTL operacional):
  - `scripts/wg_activate_site.sh`
  - `scripts/wg_deactivate_site.sh`
- Diagnóstico de API Omada:
  - `scripts/omada_wireguard_api_probe.sh`
  - `scripts/omada_wireguard_create_probe.sh`
  - `scripts/inspect_wireguard_site_endpoint.sh`
- UI operacional local para equipe:
  - `scripts/start_wireguard_gui.sh`
  - `scripts/wireguard_gui.js`
- Bootstrap de hub dedicado Linux:
  - `scripts/setup_wireguard_hub_debian.sh`

## 2) Arquitetura recomendada para sua empresa

- Hub central WireGuard em máquina dedicada (Debian 12).
- Cada cliente (ER605) como spoke.
- Técnicos acessam os clientes via túnel e sessão controlada.
- Isolamento entre clientes (sem tráfego lateral site-a-site).

Faixa sugerida para iniciar:

- Overlay WG: `10.200.0.0/24`
- Hub: `10.200.0.1`
- Técnicos: `10.200.0.2` em diante
- Sites: `10.200.0.10` em diante

## 3) Fase 1 — Piloto (1 cliente)

### 3.1 Subir hub dedicado

No host Debian do hub (como root):

```bash
HUB_IF=eth0 HUB_WG_IF=wg0 HUB_WG_ADDR=10.200.0.1/24 HUB_WG_PORT=51820 ./scripts/setup_wireguard_hub_debian.sh
```

Depois:

- Criar NAT UDP `51820` no roteador de borda para IP do hub.
- Validar no hub:

```bash
wg show
ip route
sudo systemctl status wg-quick@wg0 --no-pager
```

### 3.2 Preparar integração Omada

1. Copiar `omada-mcp.config.example.json` para um arquivo local de uso.
2. Preencher credenciais reais (`OMADA_URL`, `OMADA_USERNAME`, `OMADA_PASSWORD`, `OMADA_SITE`).
3. Rodar diagnóstico de endpoints antes de provisionar em produção.

### 3.3 Provisionar 1 site de teste

Com variáveis de ambiente carregadas:

```bash
OMADA_URL='https://SEU-CONTROLLER:8043' \
OMADA_USERNAME='SEU_USUARIO' \
OMADA_PASSWORD='SUA_SENHA' \
OMADA_SITE_ID='SEU_SITE_ID' \
WG_ENDPOINT='SEU_IP_PUBLICO:51820' \
WG_INTERFACE_NAME='Home' \
WG_CLIENT_IP='192.168.50.21/32' \
./scripts/provision_wireguard_omada.sh 'Nome do Site' 'Cliente Piloto'
```

### 3.4 Validar conectividade

- Handshake ativo no hub (`wg show`).
- Rota para LAN do cliente aplicada quando sessão for ativada.
- Ping/SSH/RDP somente ao cliente alvo.

## 4) Fase 2 — Segurança operacional

- Definir regra formal de isolamento entre clientes.
- Registrar quem ativou qual túnel e por quanto tempo.
- Usar TTL padrão de sessão (ex.: 2h), com expiração automática.
- Bloquear ações destrutivas sem confirmação explícita.

## 5) Fase 3 — Operação da equipe

Subir UI local para operações:

```bash
./scripts/start_wireguard_gui.sh
```

Fluxo operacional recomendado:

1. Selecionar site
2. Ativar sessão de técnico com TTL
3. Executar atendimento
4. Encerrar sessão manualmente (ou aguardar expiração)

## 6) Fase 4 — Escala

- Implantar por ondas (5-10 sites por lote).
- Congelar padrão de naming (`site`, `peer`, `cliente`).
- Criar backup diário de configuração Omada/WireGuard.
- Padronizar redes LAN por cliente para evitar colisão de sub-rede.

## 7) Critérios de “pronto para produção”

- Piloto estável por 7 dias.
- Sem colisão de rota entre clientes.
- Tempo de ativação de túnel < 2 minutos.
- Auditoria de sessões funcionando (quem, quando, qual site).
- Procedimento de rollback validado.

## 8) Próxima execução recomendada

Ordem prática para começar hoje:

1. Subir hub dedicado.
2. Fazer port-forward UDP 51820.
3. Rodar diagnóstico de API Omada.
4. Provisionar 1 site piloto.
5. Validar atendimento remoto ponta a ponta.

