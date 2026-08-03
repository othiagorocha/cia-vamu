# Prompt de implementação — CIA VAMU

Cole o bloco abaixo no Agent do Cursor (no workspace onde o app será criado, ou com instrução explícita de criar o diretório `cia-vamu`).

Se o Agent estiver no repo MeetAI, siga também os docs em `.cursor/utils/cia-vamu/` e copie `rules/*.mdc` para `cia-vamu/.cursor/rules/` ao final do scaffold.

---

```text
Crie o site **CIA VAMU** no diretório `cia-vamu`.

### Contexto do produto
- Nome: **CIA VAMU**
- Significado: **Visão, Arte, Missão, Unção**
- Site institucional de um ministério (teatro, viagens, evangelismos e eventos).
- Público: visitantes (site público) + equipe (área admin autenticada para gerenciar conteúdo).

### Escopo MVP (implementar agora)
1. **Home** – apresentação da CIA VAMU, destaques de álbuns e próximos eventos.
2. **Quem somos** – história/missão/visão/valores (estrutura de conteúdo editável ou estático bem feita).
3. **Entre em contato** – formulário (nome, e-mail, mensagem) com validação Zod + feedback (toast).
4. **Álbuns / Galeria** – fotos do trabalho separadas por álbuns (listar álbuns → abrir álbum → ver fotos em grid/lightbox).
5. **Agenda** – listagem pública de próximos eventos (teatro, viagens, evangelismos, etc.) com data, local, tipo e descrição.
6. **Admin (dashboard autenticado)** – CRUD de:
   - Eventos da agenda
   - Álbuns e fotos
   - (opcional no MVP) conteúdo da página “Quem somos”

### Feature futura (NÃO implementar agora; apenas preparar a estrutura)
- Compra de produtos (e-commerce). Deixar módulo/placeholder `products` ou comentário na arquitetura, sem checkout real.

### Stack tecnológica (espelhar MeetAI na UI/módulos/auth; Supabase = DB + Storage)
Usar:
- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (Radix) + `class-variance-authority`, `clsx`, `tailwind-merge`
- **tRPC** + **TanStack React Query**
- **Drizzle ORM** + **Supabase Postgres** (`DATABASE_URL`)
- **better-auth** (login da área admin) — **não** usar Supabase Auth
- **Supabase Storage** — upload de capas e fotos dos álbuns
- **Zod** + **react-hook-form** + `@hookform/resolvers`
- **nuqs** (filtros/paginação na URL quando fizer sentido)
- **date-fns** (datas da agenda)
- **sonner** (toasts)
- **lucide-react** (ícones)
- **next-intl** com **pt-BR padrão**
- **pnpm** como package manager

NÃO usar:
- Neon (usar Postgres do Supabase)
- Supabase Auth (usar better-auth)
- Stream Video / Stream Chat
- Inngest / Agent Kit / OpenAI
- Polar / billing / planos premium
- Dicebear
- Qualquer feature de “reuniões com agentes de IA”

### Estrutura de software (igual MeetAI)
Organização por módulos de domínio:

```
src/
  app/
    (public)/
    (auth)/
    (dashboard)/
    api/
    layout.tsx
    globals.css
  modules/
    home/
    about/
    contact/
    albums/
    events/
    auth/
    dashboard/
    # products/  # placeholder futuro
  components/
  db/
  trpc/
  lib/
  messages/
```

Padrões por módulo:
- `modules/<domínio>/ui/views/` e `ui/components/`
- `modules/<domínio>/server/procedures.ts` (tRPC)
- `modules/<domínio>/schema.ts` (Zod)
- `modules/<domínio>/types.ts`
- Páginas em `app/` só orquestram; views ficam nos modules.

### Modelo de dados (sugerido)
- Sessão admin: **better-auth** (tabelas no mesmo Postgres do Supabase)
- albums (id, title, description, coverImageUrl, published, publishedAt, createdAt…)
- photos (id, albumId, imageUrl, storagePath?, caption, sortOrder…)
- events (id, title, description, type: teatro|viagem|evangelismo|outro, startsAt, endsAt?, location?, published, createdAt…)
- contact_messages (id, name, email, message, createdAt…)
- MVP de mídia: **Supabase Storage** (bucket `albums`); persistir URL/path no DB

### Env (mínimo)
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`

### Design system e cores (a partir da logo)
Logo monocromática (preto + círculo/seta brancos, seta arredondada).

Paleta:
- Primary / marca: preto `#000000`
- Foreground em dark: branco `#FFFFFF`
- Superfície clara: branco / off-white
- Muted: cinzas neutros
- Alertas / highlights / badges: Tailwind **orange-400** (`#fb923c`)
- Destructive: vermelho shadcn
- Radius: cantos arredondados (`rounded-lg` / `rounded-full` em CTAs)
- Evitar tema roxo genérico de AI; alto contraste preto/branco + orange-400

Diretrizes:
- Site público limpo; hero com marca em destaque
- Admin: sidebar, tabelas, empty/loading/error
- Mobile-first; acessibilidade básica

### Páginas públicas
- `/` Home
- `/quem-somos`
- `/contato`
- `/albuns` e `/albuns/[albumId]`
- `/agenda`

### Páginas admin
- `/sign-in`
- `/dashboard`
- `/dashboard/events`
- `/dashboard/albums`

### Cursor IDE
- Criar `.cursor/rules/` e copiar os templates de rules documentados em MeetAI `.cursor/utils/cia-vamu/rules/`
- Seguir `.cursor/utils/cia-vamu/cursor.md` (AGENTS.md opcional; command `/commit` recomendado)

### Qualidade
- Tipagem forte TypeScript
- Validação Zod
- Loading / empty / error states
- i18n pt-BR nas strings de UI
- Scripts: `dev`, `build`, `lint`, `typecheck`, `db:push`, `db:studio`
- README com setup e env vars

### Ordem de implementação
1. Scaffold Next.js + Tailwind 4 + shadcn + estrutura de pastas
2. Tema/cores + layout público + logo
3. Projeto Supabase (Postgres) + Drizzle (`DATABASE_URL`) + schema
4. better-auth + layout dashboard
5. Supabase Storage (bucket álbuns)
6. Módulo events (público + admin)
7. Módulo albums/photos (público + admin + upload)
8. Contato + Quem somos
9. Home integrando destaques
10. i18n pt-BR e polish responsivo
11. Configurar `.cursor/rules` a partir dos templates

Comece pelo scaffold e pela home pública com a identidade visual (preto/branco + orange-400), depois avance pelos módulos na ordem acima.
```
