# Stack — CIA VAMU

Espelha o MeetAI no que for relevante (Next, tRPC, módulos, UI, **better-auth**).  
**Supabase** entra como **Postgres** e **Storage** de arquivos (não como provedor de Auth).

## Usar

| Camada | Tecnologia |
|--------|------------|
| Framework | **Next.js 15** (App Router) |
| UI | **React 19** + **TypeScript** |
| Estilo | **Tailwind CSS 4** + **shadcn/ui** (Radix) + `class-variance-authority`, `clsx`, `tailwind-merge` |
| API | **tRPC** + **TanStack React Query** |
| Banco | **Drizzle ORM** + **Supabase Postgres** (`DATABASE_URL`) |
| Auth | **better-auth** (área admin) — igual ao MeetAI |
| Storage | **Supabase Storage** — capas e fotos dos álbuns |
| Forms | **Zod** + **react-hook-form** + `@hookform/resolvers` |
| URL state | **nuqs** (filtros/paginação) |
| Datas | **date-fns** |
| Toasts | **sonner** |
| Ícones | **lucide-react** |
| i18n | **next-intl** — **pt-BR** como padrão (`en` só se for barato) |
| Package manager | **pnpm** |

## Papel do Supabase

- **Postgres:** schema de domínio via Drizzle (`albums`, `photos`, `events`, `contact_messages` + tabelas do better-auth se usarem o mesmo DB).  
- **Storage:** bucket(s) para imagens; upload no admin; URLs/paths no DB.  
- **Não** usar Supabase Auth — autenticação admin é **better-auth**.

Clientes: `@supabase/supabase-js` (e helpers server se precisar) **só para Storage** (e opcionalmente utilitários); sessão admin via better-auth.

## Não usar

- Neon (substituído pelo Postgres do Supabase)  
- Supabase Auth (usar better-auth)  
- Stream Video / Stream Chat  
- Inngest / Agent Kit / OpenAI  
- Polar / billing / planos premium  
- Dicebear  
- Qualquer feature de “reuniões com agentes de IA” do MeetAI  

## Scripts esperados no `package.json`

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:generate": "drizzle-kit generate"
}
```

## Regra prática

Não adicionar bibliotecas fora desta lista sem necessidade clara e alinhada ao MVP. Preferir padrões do MeetAI para UI/tRPC/auth; Supabase para DB + arquivos.
