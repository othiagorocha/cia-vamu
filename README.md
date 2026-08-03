# CIA VAMU

Site institucional da **CIA VAMU** — Visão, Arte, Missão, Unção — um ministério que leva teatro, viagens e evangelismos a diferentes lugares e pessoas.

Aplicação Next.js 15 com área pública (institucional) e área administrativa autenticada para gestão de agenda de eventos e álbuns de fotos.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (Radix)
- **tRPC** + **TanStack React Query** (client e RSC prefetch/hydration)
- **Drizzle ORM** + **Postgres (Supabase)**
- **better-auth** (autenticação da área administrativa, e-mail/senha)
- **Supabase Storage** (upload de capas de álbum e fotos)
- **Zod** + **react-hook-form** (validação de formulários)
- **next-intl** (pt-BR)
- **date-fns**, **sonner**, **lucide-react**

## Estrutura de pastas

```
src/
  app/
    (public)/        # Home, Quem somos, Contato, Álbuns, Agenda
    (auth)/           # Sign-in do admin
    (dashboard)/      # Área administrativa protegida
    api/
      auth/[...all]/  # Rotas do better-auth
      trpc/[trpc]/    # Rota do tRPC
  components/         # Componentes compartilhados (site-header, site-footer, ui/*)
  db/                 # Schema Drizzle, client e seed
  i18n/               # Configuração do next-intl
  lib/                # auth, supabase, storage, utils
  messages/           # Mensagens de tradução (pt-BR.json)
  modules/            # Um módulo por domínio (about, albums, auth, contact,
                       # dashboard, events, home), cada um com schema, server
                       # (procedures tRPC), types e ui (components/views)
  trpc/               # init, router raiz, client e server (RSC)
```

## Pré-requisitos

- Node.js 20+
- pnpm 10+
- Projeto no [Supabase](https://supabase.com) (Postgres + Storage)

## Configuração

1. Copie o arquivo de variáveis de ambiente:

   ```bash
   cp .env.example .env.local
   ```

2. Preencha em `.env.local`:
   - `DATABASE_URL`: connection string do Postgres do Supabase (Settings → Database → Connection string → URI). **Atenção**: se a senha tiver caracteres especiais (`@`, `#`, etc.), faça o URL-encode (ex.: `@` vira `%40`).
   - `BETTER_AUTH_SECRET`: gere com `openssl rand -base64 32`.
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: em Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY`: em Settings → API (service_role secret — nunca expor no client).
   - `SUPABASE_STORAGE_BUCKET`: nome do bucket público criado no Storage (ex.: `albums`).
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`: usados apenas pelo script `pnpm db:seed` para criar o usuário administrador inicial.

3. Instale as dependências:

   ```bash
   pnpm install
   ```

4. Aplique o schema no banco:

   ```bash
   pnpm db:push
   ```

5. Crie o usuário administrador (lê `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME` do `.env.local`):

   ```bash
   pnpm db:seed
   ```

6. Rode o servidor de desenvolvimento:

   ```bash
   pnpm dev
   ```

   Acesse `http://localhost:3000` (site público) e `http://localhost:3000/sign-in` (login do admin).

## Scripts

| Script | Descrição |
|---|---|
| `pnpm dev` | Sobe o servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm start` | Sobe o build de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `pnpm db:push` | Aplica o schema Drizzle diretamente no banco |
| `pnpm db:generate` | Gera migrations Drizzle |
| `pnpm db:studio` | Abre o Drizzle Studio |
| `pnpm db:seed` | Cria/atualiza o usuário administrador |
| `pnpm auth:generate` | Regenera `src/db/auth-schema.ts` a partir da config do better-auth |

## Área administrativa

Após o login em `/sign-in`, o admin tem acesso a `/dashboard` com:

- **Visão geral**: contadores de eventos, álbuns e mensagens de contato.
- **Agenda** (`/dashboard/events`): CRUD de eventos (teatro, viagem, evangelismo, outro), com opção de publicar/despublicar.
- **Álbuns** (`/dashboard/albums`): CRUD de álbuns (capa, título, descrição, publicado) e gestão de fotos de cada álbum (`/dashboard/albums/[id]`), com upload direto para o Supabase Storage.

O acesso a `/dashboard/**` é protegido tanto pelo middleware (`src/middleware.ts`) quanto pelo layout do grupo `(dashboard)` e pelas procedures `protectedProcedure` do tRPC.

## Área pública

- `/` — Home com hero, álbuns em destaque e próximos eventos.
- `/quem-somos` — Missão e pilares (Visão, Arte, Missão, Unção).
- `/albuns` e `/albuns/[id]` — Galeria de álbuns publicados, com lightbox de fotos.
- `/agenda` — Próximos eventos publicados.
- `/contato` — Formulário de contato (grava mensagem no banco).

## Internacionalização

O app usa `next-intl` com locale único `pt-BR` (sem prefixo de rota, conforme escopo do MVP). As mensagens ficam em `src/messages/pt-BR.json`, organizadas por namespace (`common`, `home`, `about`, `contact`, `albums`, `events`, `auth`, `dashboard`).
