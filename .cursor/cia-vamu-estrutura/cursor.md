# Cursor IDE — projeto `cia-vamu`

Como configurar a IDE do Cursor no app **CIA VAMU** para o Agent seguir as mesmas regras documentadas nesta pasta.

## Project rules

O Cursor carrega regras de projeto em:

```
cia-vamu/.cursor/rules/*.mdc
```

Cada arquivo `.mdc` tem frontmatter YAML:

| Campo | Tipo | Uso |
|-------|------|-----|
| `description` | string | Resumo (aparece no picker de rules) |
| `globs` | string | Se definido, a rule aplica quando arquivos matching estão no contexto |
| `alwaysApply` | boolean | Se `true`, aplica em toda sessão |

## Passo a passo

1. Crie o app no diretório `cia-vamu`.  
2. Crie a pasta `cia-vamu/.cursor/rules/`.  
3. Copie **todos** os arquivos de [rules/](./rules/) para `cia-vamu/.cursor/rules/`:  
   - `project.mdc`  
   - `stack.mdc`  
   - `architecture.mdc`  
   - `design.mdc`  
   - `typescript.mdc`  
   - `i18n.mdc`  
4. Abra o projeto `cia-vamu` no Cursor (workspace próprio).  
5. Confirme em Settings → Rules que as project rules aparecem.  

**Não** ative essas rules no repo MeetAI — elas são só do VAMU.

## AGENTS.md (recomendado)

Na raiz de `cia-vamu`, um `AGENTS.md` curto pode resumir:

- Produto CIA VAMU (Visão, Arte, Missão, Unção)  
- pt-BR padrão  
- Link mental: seguir `.cursor/rules` e docs de referência  

O detalhe fica nas rules; o `AGENTS.md` é só um ponto de entrada.

## Command `/commit` (recomendado)

Espelhar o fluxo do MeetAI: criar `cia-vamu/.cursor/commands/commit.md` com conventional commits em **pt-BR**.

Padrões:

- `/commit` sozinho → commit normal conventional commits em pt-BR  
- Parte 1: `@commit feat(4h55) descrição` → `feat(4h55): descrição`  
- Parte 2: `/commit 2 0h25 descrição` → `chore(part 2 - 0h25): descrição`  

Referência completa: no MeetAI, [`.cursor/commands/commit.md`](../../commands/commit.md).

## Relação com os docs desta pasta

| Doc | Uso no Agent |
|-----|----------------|
| [produto.md](./produto.md) | Escopo |
| [stack.md](./stack.md) / [rules/stack.mdc](./rules/stack.mdc) | Libs |
| [arquitetura.md](./arquitetura.md) / [rules/architecture.mdc](./rules/architecture.mdc) | Estrutura |
| [design.md](./design.md) / [rules/design.mdc](./rules/design.mdc) | Visual |
| [prompt.md](./prompt.md) | Bootstrapping do projeto |

Ao implementar features novas no `cia-vamu`, o Agent deve priorizar as **rules** do próprio repo; esta pasta no MeetAI é o kit de origem dos templates.
