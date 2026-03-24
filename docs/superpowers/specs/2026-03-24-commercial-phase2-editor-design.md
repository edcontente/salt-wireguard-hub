# Commercial Phase 2 Editor Design

## Goal

Evoluir o modulo `apps/commercial` para tornar a montagem de propostas mais produtiva no uso diario da equipe comercial, mantendo o foco estrito em `propostas e orcamentos`.

Esta fase adiciona um editor mais robusto para propostas por `Sistema/Ambientes`, com painel lateral comercial para edicao de itens, reordenacao mais fluida, remocao com confirmacao e uso de uma pequena massa de dados real como base de teste.

## Scope

Entra nesta fase:
- painel lateral comercial para edicao do item selecionado
- edicao manual com botao `Salvar alteracoes`
- troca de produto/servico por outro item do catalogo
- edicao de `quantidade`, `preco de venda`, `descricao comercial` e `observacoes`
- exibicao de `foto principal` no painel lateral
- reordenacao de ambientes e itens com `drag-and-drop`
- botoes de `subir/descer` como apoio
- remocao de ambiente e item com confirmacao
- alerta visual de alcada antes do submit
- bloqueio de navegacao entre itens quando houver alteracao nao salva
- carga de `10 linhas` da planilha `produto 24032026.xlsx` como massa de teste

Nao entra nesta fase:
- tela definitiva de importacao de planilha
- importacao fiscal/oficial
- estoque
- financeiro
- edicao avancada do catalogo
- lixeira/restauracao de itens ou ambientes

## User Outcome

Ao final desta fase, o vendedor deve conseguir abrir uma proposta, navegar por ambientes, selecionar um item e editar seu conteudo comercial em um painel lateral sem perder contexto da proposta.

O fluxo esperado fica assim:
1. abrir proposta em edicao
2. selecionar ambiente e item
3. abrir painel lateral comercial
4. editar item e salvar manualmente
5. reordenar ambientes e itens com `drag-and-drop` ou botoes auxiliares
6. remover ambiente/item com confirmacao
7. visualizar alerta de alcada antes de salvar mudancas proibidas

## Recommended UX Direction

O editor seguira a `Opcao B`, validada pelo usuario.

Isso significa:
- tabela principal continua visivel e organizada por `Sistema/Ambientes`
- painel lateral vira o centro da edicao do item
- o painel lateral mostra foto, troca de item, descricao, observacoes, quantidade e preco
- reordenacao principal acontece por arrastar e soltar
- botoes de `subir/descer` continuam disponiveis como apoio

## Functional Design

### 1. Main Proposal Editor

O editor permanece dividido em:
- cabecalho da proposta
- estrutura por ambientes
- lista de itens por ambiente
- acoes de envio, revisao, aprovacao e perda conforme status

As novas capacidades entram sem alterar a estrutura macro da tela.

### 2. Item Selection and Side Panel

Cada item da proposta pode ser selecionado na lista principal.

Ao selecionar um item:
- o painel lateral abre no lado direito
- o item selecionado fica visualmente destacado na lista
- o painel mostra dados editaveis e contexto comercial

Campos do painel lateral:
- produto/servico atual
- acao para trocar por outro item do catalogo
- foto principal
- quantidade
- preco de venda
- descricao comercial
- observacoes
- alerta de alcada quando aplicavel
- botao `Salvar alteracoes`

O painel nao salva automaticamente.

### 3. Unsaved Changes Guard

Se o usuario alterar algo no painel lateral e tentar:
- clicar em outro item
- trocar de ambiente
- fechar o painel

o sistema deve interromper a acao e exigir uma decisao:
- salvar alteracoes
- descartar alteracoes

Esta regra existe para evitar perda silenciosa de edicoes comerciais.

### 4. Replace Product or Service

O item da proposta pode ser trocado por outro item do catalogo a partir do painel lateral.

Comportamento esperado:
- o usuario escolhe outro item do catalogo
- o sistema atualiza o vinculo comercial do item da proposta
- o nome e a referencia comercial acompanham o item escolhido
- descricao e observacoes podem ser ajustadas manualmente antes de salvar
- a troca respeita a alcada e a regra de versao em edicao

Nao e necessario, nesta fase, criar historico detalhado de comparacao entre item antigo e novo.

### 5. Remove Item or Environment

Ao remover um item ou ambiente:
- o sistema sempre pede confirmacao
- o ambiente removido leva seus itens junto
- nao existe lixeira nesta fase

Mensagens de confirmacao devem ser claras o suficiente para evitar acao acidental.

### 6. Reordering

#### Environments

Os ambientes devem poder ser reordenados por:
- `drag-and-drop`
- botoes `subir` e `descer`

#### Items

Os itens dentro do ambiente devem poder ser reordenados por:
- `drag-and-drop`
- botoes `subir` e `descer`

A reordenacao afeta apenas a ordem visual/comercial da versao em edicao.

Nada disso pode modificar versao `LOCKED`.

### 7. Pricing and Approval Limits

O sistema deve manter a validacao final ja existente no backend, mas passa a ter tambem uma camada visual antes do submit.

Comportamento esperado:
- ao editar o preco, o painel lateral compara com o preco de referencia do item
- se houver ajuste acima da alcada do perfil, o sistema sinaliza visualmente
- o botao `Salvar alteracoes` fica bloqueado enquanto a regra estiver invalida
- o backend continua validando para impedir bypass

Esta camada visual serve para reduzir tentativa frustrada de salvamento.

### 8. Version Rules

Todos os novos comportamentos devem respeitar o ciclo de vida atual:
- apenas versao `DRAFT` pode ser editada
- versao `LOCKED` nao aceita alteracao
- proposta `APPROVED` ou `LOST` nao pode ser reaberta por estas interacoes

## Data Design

### Proposal Item

Esta fase adiciona comportamento sobre `ProposalItem` existente. Nao exige uma nova entidade principal.

Campos efetivamente editados no fluxo:
- `commercialItemId`
- `name`
- `description`
- `quantity`
- `unitPrice`

Novo complemento recomendado:
- `notes` ou campo equivalente para observacoes comerciais do item

Se o campo ainda nao existir, ele deve ser adicionado ao dominio da proposta.

### Ordering

Ambientes e itens ja possuem `position`. Esta fase reforca seu uso para:
- reorder de ambientes
- reorder de itens

### Test Data

Usaremos `10 linhas` da planilha:
- `/Users/edgardcontente/Library/Mobile Documents/com~apple~CloudDocs/Downloads/produto 24032026.xlsx`

Objetivo:
- popular ambiente de desenvolvimento
- validar o editor com dados proximos da operacao real

Esta carga e temporaria e serve apenas como massa de teste.

## Technical Design

### UI Layer

Novos componentes ou evolucoes esperadas:
- lista principal de itens com estado de selecao
- painel lateral comercial
- confirmacoes de remocao
- camada de reorder visual
- alerta visual de alcada

### Domain Layer

Novos casos de uso esperados:
- atualizar item da proposta
- trocar item do catalogo vinculado
- remover item
- remover ambiente
- reordenar ambientes
- reordenar itens

Todos devem ser testaveis fora da UI.

### Data Ingestion for Test Use

Nao havera importador definitivo nesta fase.

Vamos criar apenas um fluxo de desenvolvimento controlado para ler 10 linhas da planilha e inserir itens no catalogo local, com objetivo de teste.

Este fluxo pode ser:
- script de apoio
- seed complementar
- comando de desenvolvimento

A escolha deve privilegiar simplicidade e descarte facil depois.

## Error Handling

Casos que devem ter tratamento claro:
- tentativa de salvar alteracao acima da alcada
- tentativa de editar versao congelada
- tentativa de remover item/ambiente em versao nao editavel
- tentativa de trocar de item com alteracao nao salva
- falha na carga da planilha de teste

Mensagens devem ser comerciais e operacionais, sem expor detalhes internos.

## Testing Strategy

### Domain Tests

Cobrir:
- atualizacao de item
- troca de item do catalogo
- remocao de item
- remocao de ambiente
- reorder de ambientes
- reorder de itens
- bloqueio por alcada
- bloqueio em versao nao editavel

### Component Tests

Cobrir:
- abrir painel lateral ao selecionar item
- exibir campos editaveis no painel
- bloquear navegacao com alteracao nao salva
- confirmacao de remocao
- alerta visual de alcada

### Integration Checks

Validar:
- fluxo real com itens da massa de teste
- editor continua funcionando com PDF/link publico e ciclo de vida ja entregues

## Risks and Controls

### Risk: Drag-and-drop complexidade alta

Controle:
- manter botoes `subir/descer` como fallback obrigatorio

### Risk: Troca de item gerar incoerencia comercial

Controle:
- troca sempre passa pelo painel lateral e exige `Salvar alteracoes`

### Risk: Massa de teste virar dependencia permanente

Controle:
- limitar explicitamente a 10 linhas e tratar como carga temporaria de desenvolvimento

## Implementation Recommendation

Implementar em quatro blocos:
1. dominio de atualizacao/remocao/reorder com testes
2. painel lateral comercial com guard de alteracoes nao salvas
3. reordenacao visual + botoes auxiliares + confirmacoes
4. carga das 10 linhas da planilha como massa de teste

## Success Criteria

Esta fase estara pronta quando:
- o editor permitir editar item existente em painel lateral
- a troca de produto/servico funcionar com salvar manual
- ambientes e itens puderem ser reordenados
- remocao tiver confirmacao
- o sistema alertar alcada antes do salvar
- 10 linhas da planilha estiverem disponiveis como massa de teste no desenvolvimento
- testes e build permanecerem verdes
