# Commercial

Modulo comercial do ERP da Salt, isolado em `apps/commercial`.

O MVP cobre:
- autenticacao interna por perfil
- catalogo unificado de produtos e servicos
- propostas por `Sistema/Ambientes`
- versoes congeladas para envio
- link publico e PDF da versao enviada
- aprovacao/perda com trilha operacional basica

## Stack

- Next.js App Router
- TypeScript
- Prisma + SQLite
- Iron Session
- Vitest + Testing Library
- `@react-pdf/renderer`

## Setup local

1. Instale dependencias com `npm install`
2. Copie `.env.example` para `.env`
3. Gere o banco local com `npm run db:prepare`
4. Aplique migrations com `npx prisma migrate dev`
5. Popule o ambiente com `npx prisma db seed`
6. Inicie com `npm run dev`

## Acesso inicial

- usuario: `admin@commercial.local`
- senha: `admin123456`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run db:prepare`

## Fluxo do MVP

1. Entrar no modulo comercial
2. Cadastrar ou consultar itens em `/catalogo`
3. Criar proposta em `/propostas/nova`
4. Montar ambientes e itens na proposta
5. Enviar a versao para congelar o conteudo comercial
6. Compartilhar o link publico ou abrir o PDF da versao enviada
7. Revisar, aprovar ou marcar como perdida

## Rotas principais

- `/login`: acesso interno
- `/catalogo`: catalogo comercial
- `/propostas`: lista de propostas
- `/propostas/nova`: criacao de rascunho
- `/propostas/[proposalId]`: editor interno
- `/p/[publicToken]`: link publico da proposta enviada
- `/api/proposals/[proposalId]/pdf`: PDF da proposta enviada

## Regras importantes

- produtos e servicos entram no mesmo fluxo comercial
- apenas versao `LOCKED` pode ser compartilhada externamente
- link publico e PDF sempre saem da mesma versao congelada
- usuarios respeitam alcada de ajuste de valor definida no perfil
- ao aprovar, o sistema mostra a pergunta sobre iniciar pedido de compra
