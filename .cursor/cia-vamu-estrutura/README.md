# CIA VAMU — documentação de referência

Fonte única para construir o site **CIA VAMU** no diretório `cia-vamu`, espelhando a estrutura/UI/auth do MeetAI (**better-auth**), com **Supabase** para **Postgres** e **Storage**, e descartando o fora de escopo (Stream, IA, Polar, Neon).

Estes arquivos vivem no repo MeetAI em `.cursor/utils/cia-vamu` como referência. O app em si deve ser criado em outro diretório: **`cia-vamu`**.

## Índice

| Arquivo | Conteúdo |
|---------|----------|
| [produto.md](./produto.md) | Contexto, MVP, páginas, features futuras |
| [stack.md](./stack.md) | Tecnologias a usar e a não usar |
| [arquitetura.md](./arquitetura.md) | Pastas, módulos, tRPC/Drizzle/better-auth/Supabase |
| [design.md](./design.md) | Paleta (logo + orange-400), UI |
| [dados.md](./dados.md) | Schema + Storage Supabase |
| [env.md](./env.md) | Variáveis de ambiente e setup |
| [prompt.md](./prompt.md) | Prompt completo para colar no Agent |
| [cursor.md](./cursor.md) | Como configurar a IDE Cursor no projeto |
| [rules/](./rules/) | Templates `.mdc` → copiar para `cia-vamu/.cursor/rules/` |

## Ordem de leitura

1. `produto.md` → o que construir  
2. `stack.md` + `arquitetura.md` → como organizar  
3. `design.md` + `dados.md` → visual e modelo  
4. `env.md` → setup  
5. `cursor.md` + `rules/` → IDE  
6. `prompt.md` → execução no Agent  

## Ordem de implementação sugerida

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
11. Copiar `rules/*.mdc` para `cia-vamu/.cursor/rules/`  

## Cursor IDE

Ao criar o projeto `cia-vamu`:

1. Leia [cursor.md](./cursor.md).  
2. Crie `cia-vamu/.cursor/rules/`.  
3. Copie todos os arquivos de [rules/](./rules/) para lá.  
4. (Recomendado) Adicione o command `/commit` em `.cursor/commands/commit.md` conforme descrito em `cursor.md`.  

As rules **não** devem ser ativadas neste repo MeetAI — são do projeto VAMU.
