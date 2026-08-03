# AGENTS.md — CIA VAMU

Ponto de entrada rápido para agentes de IA trabalhando neste repositório.

## Produto

**CIA VAMU** (Visão, Arte, Missão, Unção) é um site institucional de ministério: teatro, viagens, evangelismos e eventos. MVP com área pública (Home, Quem somos, Contato, Álbuns, Agenda) e área administrativa autenticada para CRUD de eventos e álbuns/fotos.

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

Siga essas rules como fonte de verdade. Não invente features fora do escopo documentado (ex.: sem e-commerce, sem Supabase Auth, sem IA).

## Comandos úteis

- `/commit` — cria commits seguindo conventional commits em pt-BR (ver `.cursor/commands/commit.md`).

## Referências completas

O kit de origem com toda a documentação de planejamento está em `.cursor/cia-vamu-estrutura/` (produto, arquitetura, stack, design, env, prompt de bootstrap). Use como contexto histórico; as rules em `.cursor/rules/` têm prioridade para decisões do dia a dia.
