# Commercial Proposals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o primeiro modulo comercial da Salt para cadastro de itens, montagem de propostas versionadas, saida em PDF/link web e travas por perfil.

**Architecture:** Vamos criar um subprojeto novo em `apps/commercial` para manter o dominio comercial isolado do sistema WireGuard. O MVP usara um app Next.js com App Router para backoffice e link publico, Prisma + SQLite para persistencia local, e uma camada de dominio testavel para numeracao, revisao, totais, alcas e auditoria.

**Tech Stack:** Next.js 15 + React 19 + TypeScript + Prisma + SQLite + Zod + `iron-session` + `argon2` + `@react-pdf/renderer` + Vitest + Testing Library.

---

## File Structure

### Root-level changes

- Modify: `.gitignore`
- Create: `apps/commercial/package.json`
- Create: `apps/commercial/package-lock.json`
- Create: `apps/commercial/tsconfig.json`
- Create: `apps/commercial/next.config.ts`
- Create: `apps/commercial/eslint.config.mjs`
- Create: `apps/commercial/vitest.config.ts`
- Create: `apps/commercial/vitest.setup.ts`
- Create: `apps/commercial/.env.example`
- Create: `apps/commercial/README.md`

### Database and domain

- Create: `apps/commercial/prisma/schema.prisma`
- Create: `apps/commercial/prisma/seed.ts`
- Create: `apps/commercial/src/lib/db.ts`
- Create: `apps/commercial/src/lib/auth/password.ts`
- Create: `apps/commercial/src/lib/auth/session.ts`
- Create: `apps/commercial/src/lib/auth/permissions.ts`
- Create: `apps/commercial/src/lib/catalog/catalog.schemas.ts`
- Create: `apps/commercial/src/lib/catalog/catalog.service.ts`
- Create: `apps/commercial/src/lib/proposals/proposal.schemas.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-numbering.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-versioning.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-totals.ts`
- Create: `apps/commercial/src/lib/proposals/proposal.service.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-presenter.ts`
- Create: `apps/commercial/src/lib/audit/audit.service.ts`

### App routes and UI

- Create: `apps/commercial/src/app/layout.tsx`
- Create: `apps/commercial/src/app/globals.css`
- Create: `apps/commercial/src/app/login/page.tsx`
- Create: `apps/commercial/src/app/(internal)/layout.tsx`
- Create: `apps/commercial/src/app/(internal)/page.tsx`
- Create: `apps/commercial/src/app/(internal)/catalog/page.tsx`
- Create: `apps/commercial/src/app/(internal)/catalog/actions.ts`
- Create: `apps/commercial/src/app/(internal)/proposals/page.tsx`
- Create: `apps/commercial/src/app/(internal)/proposals/new/page.tsx`
- Create: `apps/commercial/src/app/(internal)/proposals/[proposalId]/page.tsx`
- Create: `apps/commercial/src/app/(internal)/proposals/[proposalId]/actions.ts`
- Create: `apps/commercial/src/app/p/[publicToken]/page.tsx`
- Create: `apps/commercial/src/app/api/login/route.ts`
- Create: `apps/commercial/src/app/api/logout/route.ts`
- Create: `apps/commercial/src/app/api/proposals/[proposalId]/pdf/route.ts`

### Reusable components

- Create: `apps/commercial/src/components/app-shell.tsx`
- Create: `apps/commercial/src/components/login-form.tsx`
- Create: `apps/commercial/src/components/catalog-item-form.tsx`
- Create: `apps/commercial/src/components/catalog-table.tsx`
- Create: `apps/commercial/src/components/proposal-editor.tsx`
- Create: `apps/commercial/src/components/proposal-section-editor.tsx`
- Create: `apps/commercial/src/components/proposal-items-table.tsx`
- Create: `apps/commercial/src/components/proposal-status-badge.tsx`
- Create: `apps/commercial/src/components/proposal-public-view.tsx`
- Create: `apps/commercial/src/components/pdf/proposal-document.tsx`

### Tests

- Create: `apps/commercial/src/lib/auth/permissions.test.ts`
- Create: `apps/commercial/src/lib/catalog/catalog.service.test.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-numbering.test.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-versioning.test.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-totals.test.ts`
- Create: `apps/commercial/src/lib/proposals/proposal.service.test.ts`
- Create: `apps/commercial/src/components/login-form.test.tsx`
- Create: `apps/commercial/src/components/proposal-editor.test.tsx`
- Create: `apps/commercial/src/components/proposal-public-view.test.tsx`

## Technical Decisions To Lock In

- Usar `apps/commercial` como fronteira explicita do dominio comercial.
- Usar `npm` no subprojeto, porque o repositorio ainda nao tem workspace manager definido na raiz.
- Usar `SQLite` no MVP para acelerar implantacao e manter ambiente local simples.
- Armazenar imagens inicialmente como URL no catalogo, sem fluxo de upload no primeiro ciclo.
- Gerar PDF a partir da mesma camada de apresentacao da versao congelada, sem depender de browser headless.

### Task 1: Bootstrap do subprojeto comercial

**Files:**
- Modify: `.gitignore`
- Create: `apps/commercial/package.json`
- Create: `apps/commercial/tsconfig.json`
- Create: `apps/commercial/next.config.ts`
- Create: `apps/commercial/eslint.config.mjs`
- Create: `apps/commercial/vitest.config.ts`
- Create: `apps/commercial/vitest.setup.ts`
- Create: `apps/commercial/.env.example`
- Create: `apps/commercial/README.md`
- Create: `apps/commercial/src/app/layout.tsx`
- Create: `apps/commercial/src/app/globals.css`
- Create: `apps/commercial/src/app/(internal)/page.tsx`
- Create: `apps/commercial/src/components/app-shell.tsx`

- [ ] **Step 1: Criar a estrutura base e scripts do app**

Adicionar dependencias e scripts minimos em `apps/commercial/package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "lint": "next lint"
  }
}
```

- [ ] **Step 2: Instalar dependencias do subprojeto**

Run: `cd apps/commercial && npm install`
Expected: `added ... packages` sem erro.

- [ ] **Step 3: Criar um smoke test do shell interno**

Criar `apps/commercial/src/components/app-shell.test.tsx` cobrindo:
- render do titulo do modulo
- render do conteudo filho
- menu lateral com `Catalogo` e `Propostas`

- [ ] **Step 4: Rodar o teste para ver falhar**

Run: `cd apps/commercial && npm test -- src/components/app-shell.test.tsx`
Expected: FAIL porque `app-shell.tsx` ainda nao existe.

- [ ] **Step 5: Implementar o shell minimo e validar**

Criar layout base, CSS global e `app-shell.tsx`, depois rodar:
- `cd apps/commercial && npm test -- src/components/app-shell.test.tsx`
- `cd apps/commercial && npm run build`

Expected: teste PASS e build inicial verde.

### Task 2: Modelar banco, seed e tipos centrais do dominio

**Files:**
- Create: `apps/commercial/prisma/schema.prisma`
- Create: `apps/commercial/prisma/seed.ts`
- Create: `apps/commercial/src/lib/db.ts`
- Create: `apps/commercial/src/lib/proposals/proposal.schemas.ts`
- Create: `apps/commercial/src/lib/catalog/catalog.schemas.ts`
- Modify: `apps/commercial/package.json`
- Test: `apps/commercial/src/lib/proposals/proposal-numbering.test.ts`

- [ ] **Step 1: Escrever o teste da numeracao inicial**

Criar `apps/commercial/src/lib/proposals/proposal-numbering.test.ts` com casos:

```ts
expect(buildProposalNumber(2026, 1)).toBe("PROP-2026-001")
expect(buildRevisionLabel("PROP-2026-001", 2)).toBe("PROP-2026-001-REV2")
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `cd apps/commercial && npm test -- src/lib/proposals/proposal-numbering.test.ts`
Expected: FAIL porque o helper ainda nao existe.

- [ ] **Step 3: Criar schema Prisma e o helper minimo**

Modelar tabelas para:
- `User`
- `CommercialProfile`
- `CommercialItem`
- `Proposal`
- `ProposalVersion`
- `ProposalSection`
- `ProposalItem`
- `ProposalPublicLink`
- `ProposalAuditLog`

Tambem criar `proposal-numbering.ts` com os helpers minimos para o teste passar.

- [ ] **Step 4: Criar e aplicar a migration inicial**

Run:
- `cd apps/commercial && npx prisma migrate dev --name init_commercial`
- `cd apps/commercial && npm test -- src/lib/proposals/proposal-numbering.test.ts`

Expected: migration criada e teste PASS.

- [ ] **Step 5: Popular o seed basico**

Adicionar seed com:
- perfil `admin_comercial`
- perfil `vendedor`
- usuario admin inicial
- categorias base de `Produto` e `Servico`

Run: `cd apps/commercial && npx prisma db seed`
Expected: seed executado sem erro.

### Task 3: Autenticacao interna e travas por perfil

**Files:**
- Create: `apps/commercial/src/lib/auth/password.ts`
- Create: `apps/commercial/src/lib/auth/session.ts`
- Create: `apps/commercial/src/lib/auth/permissions.ts`
- Create: `apps/commercial/src/lib/auth/permissions.test.ts`
- Create: `apps/commercial/src/app/login/page.tsx`
- Create: `apps/commercial/src/app/api/login/route.ts`
- Create: `apps/commercial/src/app/api/logout/route.ts`
- Create: `apps/commercial/src/components/login-form.tsx`
- Create: `apps/commercial/src/components/login-form.test.tsx`
- Create: `apps/commercial/src/app/(internal)/layout.tsx`

- [ ] **Step 1: Escrever os testes de permissao e login**

Cobrir:
- perfil com desconto dentro da alcada
- bloqueio acima do limite
- render do formulario com `Usuario` e `Senha`

- [ ] **Step 2: Rodar os testes para ver falhar**

Run:
- `cd apps/commercial && npm test -- src/lib/auth/permissions.test.ts`
- `cd apps/commercial && npm test -- src/components/login-form.test.tsx`

Expected: FAIL porque os modulos ainda nao existem.

- [ ] **Step 3: Implementar a camada de auth**

Criar:
- hash de senha com `argon2`
- sessao com `iron-session`
- helper `canAdjustProposalTotal`
- layout interno protegido por sessao

Exemplo esperado no helper:

```ts
return requestedAdjustmentPercent <= profile.maxFinalPriceAdjustment
```

- [ ] **Step 4: Implementar login/logout minimo**

Criar rota `POST /api/login`, rota `POST /api/logout` e pagina `/login`.

Run:
- `cd apps/commercial && npm test -- src/lib/auth/permissions.test.ts`
- `cd apps/commercial && npm test -- src/components/login-form.test.tsx`

Expected: PASS.

- [ ] **Step 5: Verificar navegacao protegida**

Run: `cd apps/commercial && npm run build`
Expected: build verde com rotas internas protegidas.

### Task 4: Catalogo unificado de produtos e servicos

**Files:**
- Create: `apps/commercial/src/lib/catalog/catalog.service.ts`
- Create: `apps/commercial/src/lib/catalog/catalog.service.test.ts`
- Create: `apps/commercial/src/app/(internal)/catalog/page.tsx`
- Create: `apps/commercial/src/app/(internal)/catalog/actions.ts`
- Create: `apps/commercial/src/components/catalog-item-form.tsx`
- Create: `apps/commercial/src/components/catalog-table.tsx`

- [ ] **Step 1: Escrever os testes do servico de catalogo**

Cobrir:
- criacao de item `Produto`
- criacao de item `Servico`
- busca por nome/SKU
- validacao de campos obrigatorios por tipo

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `cd apps/commercial && npm test -- src/lib/catalog/catalog.service.test.ts`
Expected: FAIL porque o servico ainda nao existe.

- [ ] **Step 3: Implementar o servico e schemas**

Garantir campos comuns:
- `type`
- `name`
- `category`
- `subcategory`
- `unit`
- `baseCost`
- `referencePrice`
- `commercialDescription`

Campos especificos:
- `manufacturer`, `model`, `sku`, `ean`, `imageUrl` para produtos
- `operationalDescription` para servicos

- [ ] **Step 4: Implementar tela de catalogo**

Criar backoffice com:
- tabela filtravel
- formulario de criacao/edicao
- seletor de tipo `Produto/Servico`
- status ativo/inativo

Run:
- `cd apps/commercial && npm test -- src/lib/catalog/catalog.service.test.ts`
- `cd apps/commercial && npm run build`

Expected: PASS e build verde.

- [ ] **Step 5: Seed de exemplos reais do comercial**

Adicionar no seed:
- 2 produtos de exemplo
- 2 servicos de exemplo
- categorias base como `Audio`, `Video`, `Automacao`, `Infraestrutura`, `Suporte`

### Task 5: Dominio de proposta, revisao e calculo de totais

**Files:**
- Create: `apps/commercial/src/lib/proposals/proposal-versioning.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-totals.ts`
- Create: `apps/commercial/src/lib/proposals/proposal.service.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-versioning.test.ts`
- Create: `apps/commercial/src/lib/proposals/proposal-totals.test.ts`
- Create: `apps/commercial/src/lib/proposals/proposal.service.test.ts`
- Create: `apps/commercial/src/lib/audit/audit.service.ts`

- [ ] **Step 1: Escrever testes de versao e totais**

Cobrir:
- abertura da proposta em `Rascunho`
- congelamento de versao enviada
- criacao de `REV1`
- soma por secoes e total geral
- bloqueio de ajuste acima da alcada

- [ ] **Step 2: Rodar os testes para ver falhar**

Run:
- `cd apps/commercial && npm test -- src/lib/proposals/proposal-versioning.test.ts`
- `cd apps/commercial && npm test -- src/lib/proposals/proposal-totals.test.ts`
- `cd apps/commercial && npm test -- src/lib/proposals/proposal.service.test.ts`

Expected: FAIL porque os helpers ainda nao existem.

- [ ] **Step 3: Implementar os helpers puros**

Criar funcoes para:
- gerar snapshot de versao
- calcular subtotal por secao
- calcular total final da proposta
- duplicar versao anterior em revisao nova

- [ ] **Step 4: Implementar o servico de proposta**

Cobrir operacoes:
- `createDraftProposal`
- `addSection`
- `addProposalItem`
- `sendProposalVersion`
- `createRevisionFromCurrentVersion`
- `markProposalAsApproved`
- `markProposalAsLost`

- [ ] **Step 5: Validar e registrar auditoria**

Run:
- `cd apps/commercial && npm test -- src/lib/proposals/proposal-versioning.test.ts`
- `cd apps/commercial && npm test -- src/lib/proposals/proposal-totals.test.ts`
- `cd apps/commercial && npm test -- src/lib/proposals/proposal.service.test.ts`

Expected: PASS com eventos de auditoria sendo gravados.

### Task 6: Backoffice de propostas e editor por Sistema/Ambientes

**Files:**
- Create: `apps/commercial/src/app/(internal)/proposals/page.tsx`
- Create: `apps/commercial/src/app/(internal)/proposals/new/page.tsx`
- Create: `apps/commercial/src/app/(internal)/proposals/[proposalId]/page.tsx`
- Create: `apps/commercial/src/app/(internal)/proposals/[proposalId]/actions.ts`
- Create: `apps/commercial/src/components/proposal-editor.tsx`
- Create: `apps/commercial/src/components/proposal-section-editor.tsx`
- Create: `apps/commercial/src/components/proposal-items-table.tsx`
- Create: `apps/commercial/src/components/proposal-status-badge.tsx`
- Create: `apps/commercial/src/components/proposal-editor.test.tsx`

- [ ] **Step 1: Escrever o teste do editor de proposta**

Cobrir:
- render de secoes por ambiente
- inclusao de item de produto
- inclusao de item de servico
- exibicao de status e total

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `cd apps/commercial && npm test -- src/components/proposal-editor.test.tsx`
Expected: FAIL porque o editor ainda nao existe.

- [ ] **Step 3: Implementar listagem e criacao**

Criar:
- tela `/proposals` com filtro por status
- fluxo `/proposals/new`
- editor principal da proposta

- [ ] **Step 4: Implementar a experiencia por ambientes**

Permitir:
- criar/remover secoes
- ordenar itens
- editar quantidade e descricao comercial
- ajustar preco dentro da alcada
- mostrar bloqueio visual quando exceder limite

- [ ] **Step 5: Validar UI e build**

Run:
- `cd apps/commercial && npm test -- src/components/proposal-editor.test.tsx`
- `cd apps/commercial && npm run build`

Expected: PASS e tela navegavel no build.

### Task 7: Link publico e PDF da proposta congelada

**Files:**
- Create: `apps/commercial/src/lib/proposals/proposal-presenter.ts`
- Create: `apps/commercial/src/components/proposal-public-view.tsx`
- Create: `apps/commercial/src/components/proposal-public-view.test.tsx`
- Create: `apps/commercial/src/components/pdf/proposal-document.tsx`
- Create: `apps/commercial/src/app/p/[publicToken]/page.tsx`
- Create: `apps/commercial/src/app/api/proposals/[proposalId]/pdf/route.ts`

- [ ] **Step 1: Escrever o teste da camada de apresentacao**

Cobrir:
- render dos ambientes
- render de itens com fotos e descricao
- ocultacao de dados internos como custo e alcada

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `cd apps/commercial && npm test -- src/components/proposal-public-view.test.tsx`
Expected: FAIL porque a view publica ainda nao existe.

- [ ] **Step 3: Implementar o presenter compartilhado**

Criar um presenter que receba `ProposalVersion` congelada e produza um view model comum para:
- pagina publica
- documento PDF

- [ ] **Step 4: Implementar link e PDF**

Criar:
- rota publica `/p/[publicToken]`
- geracao de PDF em `/api/proposals/[proposalId]/pdf`
- regra para gerar sempre a partir da versao enviada

- [ ] **Step 5: Validar consistencia das saidas**

Run:
- `cd apps/commercial && npm test -- src/components/proposal-public-view.test.tsx`
- `cd apps/commercial && npm run build`

Expected: PASS e build verde com link publico/pipeline de PDF.

### Task 8: Aprovar, perder, revisar e fechar o MVP comercial

**Files:**
- Modify: `apps/commercial/src/lib/proposals/proposal.service.ts`
- Modify: `apps/commercial/src/app/(internal)/proposals/[proposalId]/actions.ts`
- Modify: `apps/commercial/src/components/proposal-editor.tsx`
- Modify: `apps/commercial/src/components/proposal-status-badge.tsx`
- Modify: `apps/commercial/src/components/proposal-public-view.tsx`
- Modify: `apps/commercial/README.md`

- [ ] **Step 1: Escrever os testes finais do ciclo de vida**

Cobrir:
- envio oficial altera status para `Enviada`
- revisao cria `REV1`
- aprovacao marca `Aprovada`
- perda marca `Perdida`
- aprovacao mostra pergunta para iniciar pedido de compra

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `cd apps/commercial && npm test -- src/lib/proposals/proposal.service.test.ts`
Expected: FAIL nos cenarios finais ainda nao implementados.

- [ ] **Step 3: Implementar acoes finais de status**

Completar regras de:
- envio
- revisao
- aprovar
- perder
- exibicao da pergunta operacional de pedido de compra

- [ ] **Step 4: Rodar a verificacao completa**

Run:
- `cd apps/commercial && npm test`
- `cd apps/commercial && npm run build`

Expected: suite toda verde e build final sem erro.

- [ ] **Step 5: Commit**

```bash
git add .gitignore apps/commercial docs/superpowers/plans/2026-03-24-commercial-proposals-implementation.md
git commit -m "feat: add commercial proposals module MVP"
```

## Manual Verification Checklist

- Login interno funciona com sessao persistida.
- Catalogo aceita `Produto` e `Servico`.
- Proposta nova nasce em `Rascunho`.
- Estrutura por `Sistema/Ambientes` funciona com multiplas secoes.
- Envio gera versao congelada.
- Revisao gera `REV1` sem sobrescrever a versao anterior.
- Usuario fora da alcada nao consegue salvar alteracao proibida.
- Link publico exibe apenas dados comerciais.
- PDF sai da mesma versao mostrada no link.
- Aprovacao mostra a pergunta sobre pedido de compra.

## Notes For Execution

- Trabalhar sempre a partir da worktree `.worktrees/commercial-proposals`.
- Manter o MVP estritamente comercial; nao puxar estoque, fiscal ou financeiro nesta rodada.
- Se a geracao de PDF travar demais, priorizar a camada compartilhada de presenter e manter um renderer simples antes de sofisticar o layout.
- Se upload de imagem começar a expandir o escopo, manter apenas `imageUrl` no primeiro ciclo.
