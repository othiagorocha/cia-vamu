# Auditoria de ações do painel

Proposta de produto e arquitetura. **Ainda não implementada.** Serve para alinhar a equipe antes de escrever código.

## Por quê

Várias pessoas (membros, editores e gestores) publicam e apagam conteúdo no admin. Quando algo some ou muda “sem querer”, precisamos de uma trilha **justa**: quem fez, o quê, em qual registro e quando.

Não é ferramenta de vigilância. É memória compartilhada para esclarecer erros, treinar quem entra na equipe e evitar acusação sem fato.

## Princípios

- **Só escrita.** Ler lista, abrir foto ou prefetch **não** gera log.
- **Append-only.** O log não se edita nem se apaga pela UI. Errar e corrigir gera um segundo evento (`update` / `restore`), não reescreve o primeiro.
- **Snapshot do autor.** Gravar `actorName` (e e-mail) no momento da ação, para o histórico continuar legível se a conta for renomeada ou removida.
- **Mínimo de dado sensível.** Pedidos de oração e mensagens de contato: id + rótulo curto (ex. “anônimo” ou primeiro nome). **Nunca** o corpo do pedido, e-mail do remetente ou depoimento pastoral.
- **Mesma stack.** Drizzle + Postgres (Supabase), tRPC, better-auth. Sem biblioteca nova de analytics.

## Quem vê

| Papel | Capability | Vê o log |
|---|---|---|
| Gestor | `users:manage` | Sim, de todo mundo |
| Editor | `events:write` / `albums:write` / `site:write` | Não |
| Membro | (sem write) | Não |

A tela fica atrás de `requireCapability("users:manage")`, como `/admin/equipe`. Quem não for gestor nem vê o item no menu.

Cada pessoa continua responsável pelas próprias ações; o log só torna isso verificável.

## O que auditar

Ações de **mutação** no servidor, depois do sucesso da procedure.

### Agenda (`events`)

- `events.create` / `events.update` / `events.remove` / `events.reorder`
- Publicar / despublicar (se for campo no update, registrar `published` no metadata)

### Álbuns e fotos (`albums`)

- Álbum: criar, editar, excluir, definir capa, criar subálbum
- Foto: enviar, editar metadados, mover, excluir
- Comentário: ocultar, restaurar, excluir de vez (moderação)

Curtir/descurtir e comentar foto: **fase 2** (muito volume; reavaliar se a trilha de moderação já basta).

### Oração (`prayers`)

- `prayers.create` (pedido pelo painel)
- `prayers.remove`

Metadata: `{ anonymous: true }` ou `{ name }` — sem `body`.

### Equipe (`staff`)

- Criar acesso, editar nome/permissões, redefinir senha (sem gravar a senha), desativar/reativar, excluir
- Convite: gerar, copiar de novo, revogar
- Aceite de convite (actor = quem acabou de criar a conta)

### Redes (`social`)

- Criar, editar, excluir, reordenar, publicar/despublicar

### Mensagens (`contact`)

- Marcar lida / não lida, excluir  
- Sem o texto da mensagem no metadata

### Perfil (`members`)

- `members.updateMe` (nome, foto, depoimento) — útil se alguém alterar o próprio perfil e depois houver dúvida

### Auth (opcional, depois)

- Login com sucesso e logout. Útil para “eu não estava logado”. Não é prioridade da primeira entrega.

## O que não auditar

- GET / queries tRPC (`list`, `getById`, `getMe`)
- Digitação em formulário antes de salvar
- Upload em andamento (só o `addPhoto` / `create` que persistiu)
- Corpo de oração, mensagem de contato, senha, token de convite
- Tráfego do site público (visitas, analytics)

## Modelo sugerido

Tabela `audit_logs` no Postgres (Drizzle, mesmo `DATABASE_URL`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `defaultRandom()` |
| `actor_user_id` | text, FK `user.id` `onDelete set null` | Quem fez; null se a conta foi apagada |
| `actor_name` | text not null | Snapshot |
| `actor_email` | text not null | Snapshot |
| `action` | text not null | Ex.: `albums.photo.delete` |
| `entity_type` | text not null | Ex.: `photo`, `event`, `prayer_request` |
| `entity_id` | text not null | Id do registro (uuid ou text do better-auth) |
| `metadata` | jsonb | Enxuto: título, `published`, `fromAlbumId`… |
| `created_at` | timestamptz not null | `defaultNow()`, timezone |

Índices: `created_at` desc, `actor_user_id`, `(entity_type, entity_id)`, `action`.

**Sem** `update`/`delete` de linha na aplicação. Retention (apagar logs com mais de N meses) fica para uma decisão futura, por script/gestor, não pela UI do dia a dia.

Convenção de `action`: `{modulo}.{entidade}.{verbo}` em inglês estável no banco (a UI traduz). Exemplos:

- `events.create`
- `albums.photo.move`
- `prayers.remove`
- `staff.password.reset`
- `staff.invite.revoke`

## Onde gravar

Helper no servidor, chamado **no fim** das mutations autenticadas (depois do insert/update/delete ter dado certo).

Esboço:

```ts
await writeAuditLog({
  actor: ctx.session.user,
  action: "albums.photo.delete",
  entityType: "photo",
  entityId: input.id,
  metadata: { albumId },
});
```

- Só no servidor (`src/lib/audit-log.ts` ou `src/modules/audit/server/`).
- Falha ao gravar o log **não** deve desfazer a ação principal (o conteúdo já mudou); logar o erro no servidor e seguir. Na primeira versão, preferir `try/catch` isolado a abortar o tRPC.
- Não disparar do client: a UI mente; o banco é a fonte.

## UI futura

Rota: `/admin/auditoria` (grupo `admin/(dashboard)`).

- Tabela: data/hora (fuso de Brasília), pessoa, ação (pt-BR), alvo (título ou id curto).
- Filtros: pessoa, módulo (agenda, álbuns, oração, equipe, redes, mensagens), período.
- Paginação. Sem edição da linha.
- Item na sidebar só com `users:manage`.
- Strings em `src/messages/pt-BR.json` (namespace `audit`).

Fora do MVP até este doc ser aprovado e uma fase de implementação aberta.

## Fora de escopo (agora)

- E-mail / WhatsApp quando alguém apaga
- Export CSV / PDF
- Política formal de retenção (LGPD além do mínimo: não guardar corpo de oração)
- Log de leitura
- Dashboard de “quem mais publica”

## Ordem sugerida quando for implementar

1. Schema `audit_logs` + `pnpm db:push`.
2. Helper `writeAuditLog` + 2–3 mutations piloto (ex.: `prayers.remove`, `events.remove`, `albums.removePhoto`).
3. Tela `/admin/auditoria` com filtro de período.
4. Cobrir o restante das mutations de escrita.

Aceite da primeira fatia: excluir um pedido de oração gera uma linha visível para o gestor, sem o texto do pedido; editor não acessa a rota.
