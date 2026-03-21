# WireGuard Site Dashboard Design

## Objetivo

Criar uma nova tela de dashboard dentro da aplicação existente de suporte WireGuard/Omada para dar visibilidade operacional rápida sobre os sites conectados ao hub, evidenciar falhas recentes de conectividade e permitir a geração de credenciais individuais de técnicos com download do arquivo `.conf` e QR code.

## Decisões Aprovadas

- A solução ficará na aplicação atual, em uma nova tela de dashboard.
- O fluxo antigo de provisão continuará existindo separadamente.
- O topo da página mostrará:
  - quantidade total de sites
  - quantidade de sites com handshake recente
  - quantidade de sites com falha ou sem handshake recente
- "Handshake recente" significa handshake nos últimos 15 minutos.
- Cada site terá um card próprio.
- Cada técnico terá sua própria credencial WireGuard.
- A configuração do técnico serve para conectar o técnico ao hub; o acesso aos sites ocorre via hub.

## Abordagem

Adicionar uma nova rota de dashboard na aplicação Node atual em [wireguard_gui.js](/Users/edgardcontente/Documents/Codex/Salt/scripts/wireguard_gui.js), reaproveitando:

- cache de sites em `wireguard-output/site-cache`
- alocações IPAM em `wireguard-output/ipam`
- geração atual de arquivos `.conf`

A nova tela será orientada a monitoramento e operação, enquanto a tela atual continua focada em configuração base e provisão rápida.

## Fontes de Dados

### Sites

- Fonte principal: cache local de sites em `wireguard-output/site-cache/sites.json`
- Cada card será montado a partir do `siteId` e `siteName`

### Estado WireGuard do Site

- Fonte: leitura via Omada API/OpenAPI dos peers/interfaces WireGuard por site
- O dashboard deve derivar:
  - interface usada pelo hub (`HUB-SPOKE`)
  - IP do túnel do site
  - peer do hub (`HUB-UPLINK`)
  - endpoint configurado
  - último handshake, quando disponível

### Técnicos e Credenciais

- Fonte inicial: arquivos `.conf` já gerados por site e IPAM local
- Novas credenciais serão geradas sob demanda por site/técnico

## Regras de Status

Cada site deve cair em um dos estados abaixo:

- `online`: handshake do peer do hub dentro da janela de 15 minutos
- `stale`: provisionado, mas sem handshake dentro da janela
- `warning`: dados incompletos, peer ausente, interface ausente ou divergência de configuração

No topo:

- `Total de Sites`: total de sites conhecidos no cache
- `Handshake Recente`: total com estado `online`
- `Falhas / Sem Handshake`: total com estado `stale` ou `warning`

## Layout da Tela

### Direção Visual

- Fundo principal branco ou quase branco
- Texto em tons escuros com contraste alto
- Prioridade absoluta para legibilidade
- Estados visuais claros:
  - `online` em verde legível
  - `stale` e `warning` em tons quentes com contraste suficiente
- Evitar combinações de baixo contraste
- A interface deve ser confortável para leitura prolongada em desktop e mobile

### Faixa Superior

Três blocos de resumo:

- total de sites
- handshake recente
- falhas / sem handshake

### Área de Filtros

Filtros mínimos:

- busca por nome do site
- filtro por status
- janela de handshake, iniciando em 15 minutos
- ação manual para atualizar status

### Cards por Site

Cada card deve mostrar no mínimo:

- nome do site
- site ID
- badge visual de status
- IP do túnel do site
- nome da interface WireGuard
- peer do hub
- endpoint do hub
- último handshake
- indicação de falha, quando houver
- quantidade de credenciais de técnico já geradas

### Operação por Técnico

Dentro de cada card:

- campo para identificar o técnico/dispositivo
- ação para gerar credencial
- ação para baixar `.conf`
- QR code da configuração mais recente
- espaço para detalhes adicionais do técnico, se necessário

## Geração de Configuração do Técnico

Cada credencial de técnico será um peer individual do hub.

Fluxo desejado:

1. operador informa nome do técnico/dispositivo dentro do card do site
2. sistema gera ou recupera a credencial correspondente
3. sistema disponibiliza:
   - arquivo `.conf` para download
   - QR code da configuração

Observação importante:

- a credencial do técnico conecta ao hub
- o site não recebe uma credencial separada por técnico
- o acesso ao cliente ocorre por meio do hub e do estado operacional do site

## Restrições e Compatibilidade

- Preservar a interface atual de provisão rápida
- Não quebrar o armazenamento atual de IPAM e cache
- Suportar desktop e mobile
- Manter acesso simples e visualmente rápido
- Evitar dependência de interação manual no Omada para peers já automatizados

## Primeira Entrega

A primeira versão deve incluir:

- nova rota/tela de dashboard
- leitura de sites do cache
- leitura de status WireGuard por site
- resumo superior com métricas
- cards por site
- geração individual de configuração por técnico
- download de `.conf`
- QR code por configuração

Itens que podem ficar para iterações seguintes:

- paginação avançada
- histórico de handshakes
- auditoria detalhada por técnico
- ações em lote
