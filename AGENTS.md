# AGENTS.md — CIA VAMU

Ponto de entrada rápido para agentes de IA trabalhando neste repositório.

## Produto

**CIA VAMU** (Visão, Arte, Missão, Unção) é um site institucional de ministério: teatro, viagens, evangelismos e eventos. MVP  área pública (Home, Quem somos, Contato, Álbuns, Agenda) e área administrativa autenticada para CRUD de eventos e álbuns/fotos.

## Idioma

Responda sempre em **pt-BR**. A UI do app usa `next-intl` com locale único `pt-BR` (mensagens em `src/messages/pt-BR.json`).

## Regras do projeto

O detalhe de stack, arquitetura, design e convenções de TypeScript/i18n está em `.cursor/rules/*.mdc` (carregadas automaticamente pelo Cursor):

- `project.mdc` — escopo do produto e rotas.
- `stack.mdc` — bibliotecas permitidas.
- `architecture.mdc` — organização em módulos por domínio.
- `design.mdc` — tema (preto/branco + acento `orange-400`).
- `typescript.mdc` — convenções de tipagem.
- `i18n.mdc` — uso do next-intl e mensagens por namespace.
- `agent-workflow.mdc` — scripts em `./scripts/`; **merge em `main` = produção**; typecheck; no máx. 3 commits sem push.

Siga essas rules como fonte de verdade. Não invente features fora do escopo documentado (ex.: sem e-commerce, sem Supabase Auth, sem IA).

## Git e produção

- Branch **`main`** = site em produção (Hostinger). Só merge/push em `main` com pedido explícito.
- Scripts de teste/diagnóstico ficam em **`./scripts/`** e devem ser removidos ao fim da investigação.
- Após mudanças pesadas, o Agent deve rodar `pnpm typecheck`.
- No máximo **3 commits** locais sem sincronizar com o remoto (`git push` em `dev` ao atingir o limite).
## Comandos úteis

- `/commit` — cria commits seguindo conventional commits em pt-BR (ver `.cursor/commands/commit.md`).

## Referências completas

O kit de origem com toda a documentação de planejamento está em `.cursor/cia-vamu-estrutura/` (produto, arquitetura, stack, design, env, prompt de bootstrap). Use como contexto histórico; as rules em `.cursor/rules/` têm prioridade para decisões do dia a dia.
