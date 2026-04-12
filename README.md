# APURAÇÃO IMOBILIÁRIA

Aplicação SaaS full stack em `Next.js 16 + App Router + Supabase`, construída em etapas, para consultores imobiliários realizarem apuração de renda bancária com revisão manual e geração final de Excel.

## Etapas entregues

- Etapa 1:
  fundação do app com auth, roles, painel super admin e deploy base
- Etapa 2:
  clientes, apurações, status, dashboard operacional, filtros, busca, paginação e RLS por `user_id`
- Etapa 3:
  upload múltiplo de PDFs, storage, metadata por arquivo, logs de processamento e pipeline inicial com `pdf-parse` + fallback OCR
- Etapa 4:
  extração estruturada de transações, adapters extensíveis, deduplicação, mês/ano, crédito/débito, confiança e suporte opcional ao OpenAI SDK

## Stack

- Next.js 16
- App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Server Actions
- Route Handlers
- Zod

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FIRST_SUPER_ADMIN_EMAIL=
OPENAI_API_KEY=
```

## Supabase

1. Crie um projeto no Supabase.
2. Rode a migration em [supabase/migrations/20260412150000_stage1_foundation.sql](/c:/Users/W-10/invictus.apuração/supabase/migrations/20260412150000_stage1_foundation.sql).
3. Rode a migration em [supabase/migrations/20260412170000_stage2_clients_apuracoes.sql](/c:/Users/W-10/invictus.apuração/supabase/migrations/20260412170000_stage2_clients_apuracoes.sql).
4. Rode a migration em [supabase/migrations/20260412190000_stage3_statement_files.sql](/c:/Users/W-10/invictus.apuração/supabase/migrations/20260412190000_stage3_statement_files.sql).
5. Rode a migration em [supabase/migrations/20260412210000_stage4_transactions.sql](/c:/Users/W-10/invictus.apuração/supabase/migrations/20260412210000_stage4_transactions.sql).
6. Configure no painel do Supabase:
   - `Site URL`: sua URL local ou de produção
   - `Redirect URLs`: inclua `/auth/callback`
7. Defina `FIRST_SUPER_ADMIN_EMAIL` com o e-mail que poderá bootstrapar o primeiro super admin.
8. `OPENAI_API_KEY` é opcional nesta etapa:
   - com chave: tenta adapter IA primeiro
   - sem chave: usa parser heurístico como fallback

## Fluxo do primeiro super admin

- O primeiro super admin é definido apenas pelo e-mail configurado em `FIRST_SUPER_ADMIN_EMAIL`.
- No primeiro login com esse e-mail, se ainda não existir nenhum `super_admin`, o sistema cria a conta e promove o perfil no banco.
- Depois disso, o papel vem exclusivamente da tabela `public.users`.

## Rodando localmente

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000/login`.

## Deploy no Vercel

1. Suba o projeto para um repositório Git.
2. Importe no Vercel.
3. Configure as mesmas variáveis do `.env.example`.
4. Garanta que `NEXT_PUBLIC_APP_URL` aponte para a URL pública do Vercel.
5. No Supabase, atualize:
   - `Site URL` para a URL do Vercel
   - `Redirect URLs` com `https://seu-dominio/auth/callback`
6. Faça o deploy.

## Estrutura da Etapa 1

- `src/app/(auth)`:
  login e atualização de senha
- `src/app/super-admin`:
  dashboard administrativo e gestão de usuários
- `src/app/app`:
  área inicial do usuário
- `src/actions`:
  server actions de auth e usuários
- `src/lib/auth`:
  guards, bootstrap, roles e queries
- `src/lib/supabase`:
  clients SSR, admin e middleware

## Próxima etapa

Etapa 5: tela de revisão operacional com TanStack Table, decisões manter/excluir/pendente, ações em lote, auditoria e autosave.
