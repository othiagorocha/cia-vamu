# Ambiente e setup — CIA 

## Variáveis de ambiente

Criar `.env` / `.env.local` (e `.env.example` no repo) com pelo menos:

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Connection string Postgres do Supabase (Drizzle + better-auth) |
| `BETTER_AUTH_SECRET` | Secret do better-auth |
| `BETTER_AUTH_URL` | URL base da app (ex. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (Storage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (upload/leitura Storage conforme políticas) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (somente server; uploads admin / gestão de arquivos) |
| `NEXT_PUBLIC_APP_URL` | URL pública (links, redirects) |

Opcionais:

| Variável | Uso |
|----------|-----|
| `SUPABASE_STORAGE_BUCKET` | Nome do bucket de mídia (ex. `albums`) |
| Secrets de e-mail | Se o formulário de contato enviar e-mail além de persistir no DB |

**Não** versionar `SUPABASE_SERVICE_ROLE_KEY` nem `BETTER_AUTH_SECRET`.

## Checklist de setup local

1. Node **>= 20**  
2. Criar projeto no [Supabase](https://supabase.com)  
3. Copiar `DATABASE_URL` (Settings → Database) + URL/keys do projeto  
4. `pnpm install`  
5. Copiar `.env.example` → `.env.local` e preencher (incluindo secrets do better-auth)  
6. Criar bucket Storage (ex. `albums`) e políticas (leitura pública das imagens publicadas; escrita só no server com service role ou usuário autorizado)  
7. `pnpm db:push` (schema Drizzle + tabelas better-auth no Postgres do Supabase)  
8. Seed / criar usuário admin via better-auth  
9. `pnpm dev`  

## Scripts

Ver [stack.md](./stack.md). Em desenvolvimento:

```bash
pnpm install
pnpm db:push
pnpm dev
pnpm typecheck
pnpm lint
```

## Deploy

- Garantir `pnpm-lock.yaml` commitado.  
- Definir Node 20+ na plataforma (`engines` ou `.nvmrc`).  
- Configurar as mesmas env vars no painel do host (Vercel, etc.).  
- Não versionar secrets.  

## Mídia no MVP

Usar **Supabase Storage**: upload no admin (server); persistir no DB a URL pública (ou path) em `coverImageUrl` / `imageUrl`.  
Auth continua **better-auth**.
