# Salt WireGuard Hub

Automacao operacional para provisionamento, conciliacao e monitoramento de tuneis WireGuard em ambientes Omada com topologia hub-and-spoke.

## O que este repositorio cobre

- Provisionamento de spokes WireGuard em sites Omada
- Conciliacao entre site e hub para manter endpoint, peer e keepalive corretos
- Dashboard web local para operacao diaria
- Geração de credenciais WireGuard por tecnico, com download de `.conf` e QR Code
- Scripts de diagnostico para investigar comportamento da API do Omada

## Estrutura principal

- `scripts/`: automacoes e utilitarios operacionais
- `scripts/lib/`: modulos usados pelo dashboard e integracoes com o hub
- `tests/`: testes automatizados do dashboard e fluxos de apoio
- `docs/superpowers/specs/`: especificacoes funcionais
- `docs/superpowers/plans/`: planos de implementacao
- `PLANO_IMPLANTACAO_WIREGUARD_EMPRESA.md`: visao geral da implantacao
- `omada-mcp.config.example.json`: exemplo de configuracao do MCP do Omada

## Fluxos principais

### 1. Provisionar um site no hub

Use o script principal:

```bash
./scripts/provision_site_spoke_to_hub.sh "Nome do Site"
```

Esse fluxo cria ou reconcilia:

- interface WireGuard do site
- peer `HUB-UPLINK`
- peer correspondente no hub
- endpoint e porta do hub no Omada

### 2. Operar pelo dashboard

Suba o dashboard local:

```bash
./scripts/start_wireguard_gui.sh
```

O dashboard permite:

- ver todos os sites
- identificar handshake recente ou falhas
- conectar um site ao hub
- consertar a conexao com reconciliacao segura
- gerar credenciais individuais para tecnicos

### 3. Diagnosticar a API do Omada

Use os scripts de probe quando precisar descobrir ou validar payloads/rotas:

- `scripts/omada_wireguard_api_probe.sh`
- `scripts/omada_wireguard_create_probe.sh`
- `scripts/inspect_wireguard_site_endpoint.sh`

## Seguranca

Este repositorio foi preparado para **nao** versionar:

- chaves privadas
- credenciais do controller
- segredos OpenAPI
- backups e saídas geradas em `wireguard-output/`
- historicos locais em `recovery/`

Preencha credenciais reais apenas em arquivos locais nao versionados ou por variaveis de ambiente.

## Revisao no GitHub

Minha sugestao de fluxo para revisao:

1. abrir uma issue por melhoria ou problema
2. trabalhar em branch dedicada
3. abrir pull request com evidencias de teste
4. usar `docs/superpowers/specs/` e `docs/superpowers/plans/` como referencia funcional

## Estado atual

O projeto ja contem:

- dashboard operacional com cards de sites
- botao `Conectar wireguard`
- botao `Consertar conexao` com reconciliacao segura e opcao de recriacao completa
- geração de perfis por tecnico com QR Code

