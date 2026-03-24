# Commercial Proposals Design

## Summary

Criar o primeiro modulo do futuro ERP da Salt focado em `propostas e orcamentos` para o mercado de audio, video e automacao.

O modulo deve permitir montar propostas comerciais com `produtos` e `servicos`, organizar a venda por `Sistema/Ambientes`, gerar saida em `PDF` e `link web`, controlar revisoes versionadas e aplicar travas comerciais por perfil de usuario.

Esta primeira entrega deve viver como um subprojeto isolado do dominio atual de WireGuard/Omada. A visao de um HUB maior com `vendas`, `tecnica`, `indicadores` e `suporte` fica como direcao futura, nao como parte desta fase.

## Goals

- Entregar um modulo comercial dedicado para montagem e envio de propostas.
- Permitir proposta com itens de `produto` e `servico` no mesmo fluxo.
- Organizar a proposta principalmente por `Sistema/Ambientes`, com flexibilidade para adaptar por projeto.
- Gerar apresentacao comercial em `PDF` e `link web`.
- Controlar ciclo de vida da proposta com status `Rascunho`, `Enviada`, `Revisao`, `Aprovada` e `Perdida`.
- Implementar revisao formal com identificadores como `PROP-2026-001-REV1`.
- Aplicar limites de desconto e alteracao de valor final conforme perfil de usuario.
- Preservar historico operacional de envio, revisao e aprovacao.
- Preparar a base para futura integracao com compras, estoque e financeiro sem puxar esses modulos agora.

## Non-Goals

- Nao implementar estoque operacional nesta fase.
- Nao implementar importacao de notas fiscais de fornecedores nesta fase.
- Nao implementar contas a pagar, contas a receber ou conciliacao financeira nesta fase.
- Nao gerar automaticamente pedido de compra ao aprovar a proposta.
- Nao criar ainda o HUB unificado com modulos de tecnica, suporte e indicadores.
- Nao misturar este novo dominio com o codigo existente de WireGuard/Omada.

## Business Context

O fluxo comercial atual funciona assim:

1. o cliente chega geralmente por um profissional parceiro, como arquitetura ou design
2. acontece um alinhamento inicial e brainstorming comercial
3. a equipe monta uma proposta com produtos previamente cadastrados
4. os produtos tendem a nascer de importacoes futuras vindas de notas fiscais e cadastros internos
5. a proposta e enriquecida com fotos, fabricante, modelo, descricao e regras comerciais
6. servicos sao adicionados pela equipe
7. a proposta e enviada em `PDF` ou `link web`
8. ajustes comerciais geram revisoes versionadas
9. o fechamento e registrado manualmente como `Aprovada` ou `Perdida`

## Product Scope

O MVP cobre quatro blocos principais:

- `Catalogo comercial`
- `Motor de propostas`
- `Apresentacao comercial`
- `Governanca comercial`

### Catalogo comercial

- cadastro de itens comerciais do tipo `Produto` ou `Servico`
- busca rapida por nome, codigo, SKU e outras chaves relevantes
- classificacao por categoria e subcategoria
- dados suficientes para compor proposta comercial sem exigir o pacote fiscal completo

### Motor de propostas

- criacao de propostas em rascunho
- montagem por `Sistema/Ambientes`
- inclusao de produtos do catalogo
- inclusao de servicos do catalogo
- edicao de quantidades, ordem, textos comerciais, imagens e precos
- consolidacao de totais da proposta
- criacao de revisoes formais

### Apresentacao comercial

- geracao de `PDF` comercial
- publicacao de `link web` da proposta
- consistencia entre as duas saidas a partir da mesma versao congelada

### Governanca comercial

- controle de status
- trilha de auditoria
- limites por perfil
- aprovacao manual interna
- pergunta operacional ao aprovar: `Deseja gerar pedido de compra para o fornecedor?`

## User Roles And Permissions

O modulo deve nascer com perfis e alcas comerciais associados.

Cada perfil tera pelo menos:

- permissao de visualizar proposta
- permissao de editar proposta
- limite maximo de desconto ou ajuste sobre o valor final
- permissao de enviar proposta
- permissao de aprovar ou marcar como perdida

Regras principais:

- usuarios podem ajustar preco somente dentro da propria alcada
- alteracoes acima do limite devem ser bloqueadas
- o sistema deve informar claramente que a operacao excede a alcada do usuario
- a aprovacao da proposta continua interna e manual

## Proposal Lifecycle

Fluxo aprovado para o MVP:

- `Rascunho`
- `Enviada`
- `Revisao`
- `Aprovada`
- `Perdida`

Regras:

- toda proposta nasce em `Rascunho`
- o primeiro envio oficial muda o status para `Enviada`
- alteracoes solicitadas apos envio geram nova revisao formal
- revisao nao sobrescreve a versao anterior enviada
- a equipe marca manualmente a proposta como `Aprovada` ou `Perdida`

## Versioning Model

Versionamento formal e obrigatorio.

### Identificadores

- proposta base: `PROP-2026-001`
- primeira revisao: `PROP-2026-001-REV1`
- segunda revisao: `PROP-2026-001-REV2`

### Regras de versao

- versao enviada fica congelada
- nova negociacao gera uma nova versao
- PDF e link web devem apontar para uma versao especifica
- historico deve exibir quando cada versao foi criada, enviada e por quem

## Catalog Model

O sistema deve usar uma base unica de `itens comerciais`, com dois tipos:

- `Produto`
- `Servico`

### Campos comuns

- nome comercial
- categoria
- subcategoria
- unidade
- custo base
- preco de referencia
- regra comercial
- desconto maximo permitido
- descricao comercial
- ativo ou inativo

### Campos especificos de produto

- codigo interno
- SKU
- EAN
- fabricante
- modelo
- fotos
- ultimo fornecedor
- codigo do fornecedor

### Campos especificos de servico

- descricao operacional
- observacoes internas
- tipo de execucao ou grupo de servico

## Catalog Scope For MVP

### Obrigatorio no MVP

- nome comercial
- tipo do item
- codigo interno ou SKU
- fabricante
- modelo quando aplicavel
- categoria
- subcategoria
- unidade
- custo base
- preco de referencia
- descricao resumida
- imagens quando aplicavel
- ativo ou inativo

### Preparado para fases seguintes

- ultimo fornecedor
- codigo do fornecedor
- EAN
- centro de custo
- flag de nao listar na venda

### Fora do MVP inicial

- pacote fiscal completo com `NCM`, `CFOP`, `CST`, `ST`, `ISSQN` e derivados
- grade complexa de variacoes
- automacoes avancadas de compra

## Proposal Structure

A estrutura principal da proposta deve ser `Sistema/Ambientes`.

Exemplos:

- `Sala`
- `Home Theater`
- `Suite`
- `Area Gourmet`

A modelagem deve permitir adaptar essa estrutura conforme a necessidade do projeto, sem forcar uma taxonomia fixa para todos os casos.

Cada ambiente pode conter:

- produtos
- servicos
- ordem de apresentacao
- observacoes comerciais
- imagens associadas aos itens

## Pricing Model

O modelo comercial precisa separar:

- visao interna de formacao de preco
- visao externa apresentada ao cliente

### Regras internas

- custo e preco de referencia devem existir para cada item
- proposta pode ajustar preco na linha respeitando a alcada
- sistema deve suportar desconto e alteracao de valor final
- trilha de auditoria deve registrar alteracoes sensiveis

### Regras externas

- cliente recebe apenas a apresentacao comercial aprovada para envio
- informacoes internas de custo, margem e trava de perfil nao aparecem no PDF ou no link

## Output Channels

O modulo deve suportar dois canais de apresentacao:

- `PDF comercial`
- `Link web interativo`

Regras:

- os dois canais devem ser gerados a partir da mesma versao
- o cliente apenas visualiza a proposta
- o cliente nao aprova a proposta pelo sistema nesta fase
- a aprovacao continua sendo recebida por fora e registrada manualmente pela equipe

## Approval Model

O fluxo aprovado para o MVP e:

- cliente analisa a proposta fora do sistema
- equipe registra internamente o resultado
- ao marcar como `Aprovada`, o sistema pergunta se deseja iniciar pedido de compra para o fornecedor

Regras:

- nao gerar pedido automaticamente
- nao gerar financeiro automaticamente
- manter apenas o gancho operacional para evolucao futura

## Data Model

Entidades principais:

- `CommercialItem`
- `Proposal`
- `ProposalVersion`
- `ProposalSection`
- `ProposalItem`
- `CommercialProfile`
- `ProposalAuditLog`

### `CommercialItem`

Representa o cadastro base de produto ou servico.

Campos centrais:

- `id`
- `type`
- `name`
- `sku`
- `manufacturer`
- `model`
- `categoryId`
- `subcategoryId`
- `unit`
- `baseCost`
- `referencePrice`
- `commercialDescription`
- `isActive`

### `Proposal`

Representa a negociacao principal.

Campos centrais:

- `id`
- `proposalNumber`
- `clientName`
- `ownerUserId`
- `status`
- `currentVersionId`
- `createdAt`
- `updatedAt`

### `ProposalVersion`

Representa cada versao formal da proposta.

Campos centrais:

- `id`
- `proposalId`
- `versionLabel`
- `revisionNumber`
- `statusAtSend`
- `sentAt`
- `createdByUserId`
- `snapshotTotals`

### `ProposalSection`

Representa um sistema, ambiente ou agrupador comercial da proposta.

Campos centrais:

- `id`
- `proposalVersionId`
- `title`
- `sortOrder`

### `ProposalItem`

Representa uma linha vendavel dentro da versao.

Campos centrais:

- `id`
- `proposalSectionId`
- `commercialItemId`
- `itemType`
- `displayName`
- `quantity`
- `unitCost`
- `unitPrice`
- `discountValue`
- `finalLineTotal`
- `commercialNotes`
- `displayOrder`

### `CommercialProfile`

Define as travas por perfil.

Campos centrais:

- `id`
- `name`
- `maxFinalPriceAdjustment`
- `canSendProposal`
- `canApproveProposal`

### `ProposalAuditLog`

Registra eventos de auditoria.

Campos centrais:

- `id`
- `proposalId`
- `proposalVersionId`
- `userId`
- `action`
- `metadata`
- `createdAt`

## UX Expectations

### Backoffice

- tela de busca de propostas com status e responsavel
- criacao rapida de nova proposta
- montagem da proposta em tela operacional
- navegacao clara por ambientes
- busca rapida de itens comerciais
- edicao de quantidade, preco e descricao
- geracao de PDF e link sem sair do fluxo

### Cliente

- visual limpo e comercial
- leitura clara de ambientes e itens
- fotos quando aplicavel
- proposta facil de compartilhar
- sem exposicao de informacoes internas de custo ou margem

## Architecture Direction

O modulo deve nascer como um novo subprojeto isolado dentro do repositorio, sem acoplamento com o dominio atual de WireGuard.

Blocos tecnicos recomendados:

- `app web interno`
- `api comercial`
- `banco relacional`
- `renderizador de proposta`

Responsabilidades:

- `catalogo`: itens comerciais
- `propostas`: proposta, versoes, secoes e itens
- `comercial`: status, auditoria e perfis
- `apresentacao`: PDF e pagina publica por link
- `auth/perfis`: usuarios e alcas

## Integration Readiness

Mesmo sem implementar os demais modulos agora, o desenho deve deixar pronto:

- vinculo futuro com pedido de compra
- vinculo futuro com estoque
- vinculo futuro com financeiro
- identificadores estaveis para integracao entre modulos

## Error Handling

- bloqueio claro quando usuario exceder a propria alcada
- tentativa de editar versao congelada deve falhar com mensagem explicita
- tentativa de gerar saida sem itens validos deve informar o problema
- historico deve preservar eventos mesmo quando uma operacao comercial falhar

## Audit And Compliance

Desde o MVP, o sistema deve registrar:

- quem criou a proposta
- quem alterou preco ou desconto
- quem enviou cada versao
- quem marcou como aprovada ou perdida
- quando uma nova revisao foi aberta

Esses registros sao obrigatorios para confianca comercial e para futura integracao com financeiro e compras.

## Testing

Cobertura minima esperada:

- criacao de proposta em `Rascunho`
- adicao de produto e servico na mesma proposta
- organizacao por `Sistema/Ambientes`
- geracao de nova revisao sem sobrescrever a anterior
- bloqueio de alteracao acima da alcada do usuario
- congelamento de versao enviada
- geracao consistente de `PDF` e `link web`
- marcacao manual de proposta como `Aprovada`
- exibicao da pergunta para gerar pedido de compra apos aprovacao

## Open Questions Deferred

Itens intencionalmente adiados para a proxima fase:

- catalogo completo de parceiros de arquitetura e design
- comissionamento de parceiros
- fluxo formal de pedido de compra
- importacao automatica de notas fiscais
- regras de estoque e reserva de itens
- integracao com contas a pagar e receber
- consolidacao de tudo em um HUB unico

## Implementation Notes

- o modulo comercial deve ser tratado como o primeiro dominio do futuro ERP
- o projeto precisa preservar uma fronteira clara entre o sistema comercial e o sistema atual de operacao WireGuard
- PDF e link web sempre devem sair da mesma versao congelada
- produtos e servicos devem compartilhar uma base unica de item comercial para simplificar proposta, permissao e evolucao futura
