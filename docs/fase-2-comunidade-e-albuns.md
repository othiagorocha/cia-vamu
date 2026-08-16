# Prompt para modo Plan — Fase 2: comunidade, conteúdo gerenciável e álbuns

Use este arquivo como entrada do modo Plan. Ele descreve o estado atual do repositório, o que precisa ser construído, em que ordem, e as decisões já fechadas (questionário em `docs/lacunas.md`). **Não reabrir** as perguntas da seção 4.

---

## 1. Contexto: o que já existe

Repositório `cia-vamu` (Next.js 15 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui, tRPC, Drizzle + Supabase Postgres, better-auth, Supabase Storage, next-intl pt-BR, pnpm).

**Site público** (`src/app/(public)`): `/`, `/quem-somos`, `/contato`, `/albuns`, `/albuns/[albumId]`, `/agenda`.

**Painel** (`src/app/admin/(dashboard)`): `/admin`, `/admin/events`, `/admin/albums`, `/admin/albums/[albumId]`, `/admin/equipe`. Login em `/admin/login`.

**Permissões já implementadas** (`src/lib/permissions.ts`):

| Capability | Cobre |
|---|---|
| `events:write` | agenda no painel |
| `albums:write` | criar/editar/apagar álbuns e fotos |
| `users:manage` | criar/editar/remover contas, e hoje também mensagens de contato |

`requireCapability(...)` em `src/trpc/init.ts` bloqueia procedures; páginas do painel fazem `redirect("/admin")` sem a capability; a sidebar esconde itens. Contas só são criadas por quem tem `users:manage` (`emailAndPassword.disableSignUp: true`).

**Schema atual** (`src/db/schema.ts`): `albums`, `photos`, `events`, `contact_messages`. `src/db/auth-schema.ts` tem `user` (com `capabilities text[]`), `session`, `account`, `verification`.

**Domínio canônico:** `https://www.ciavamu.com.br` (o apex redireciona 301 no `next.config.ts`).

---

## 2. Objetivo desta fase

1. Deixar explícito que a CIA VAMU é um **ministério evangelístico missionário** pertencente à **Igreja Evangélica Batista de Ibitinga**.
2. Tornar gerenciáveis pelo painel: redes sociais, integrantes do ministério e mensagens de contato.
3. Melhorar a usabilidade do painel (linhas clicáveis, acesso ao site público).
4. Evoluir os álbuns: sub-álbuns, contadores, upload com metadados; curtidas e comentários **só no painel**.
5. Corrigir o lightbox de fotos no site público.

**Fora desta fase:** editor de layout/estrutura de `/quem-somos` (ex-B4). A página continua estática via next-intl; integrantes entram como seção nova no `about-view`. Reavaliar o editor numa fase futura.

---

## 3. Escopo sequencial

Cada bloco traz: o que fazer, onde mexer, dados/permissões envolvidos e critério de aceite. A ordem respeita dependências — comece pela Fase A.

### Fase A — Ajustes sem schema novo

Blocos independentes entre si; entregam valor rápido e não bloqueiam nada.

#### A1. Identidade: ministério evangelístico missionário da igreja

Dois fatos precisam ficar evidentes em todo o site público:

1. A CIA VAMU é um **ministério evangelístico missionário**.
2. O ministério **pertence à Igreja Evangélica Batista de Ibitinga**.

Diretrizes:

- O caráter evangelístico missionário é posicionamento, não nota de rodapé: deve aparecer com destaque no hero da home e na abertura de `/quem-somos`, junto do nome e do significado da sigla (Visão, Arte, Missão, Unção). O vínculo com a igreja pode vir logo abaixo, em tom institucional.
- Onde mexer: hero da home (`src/modules/home/ui/views/home-view.tsx`), abertura de `/quem-somos` (`src/modules/about/ui/views/about-view.tsx`) e rodapé (`src/components/site-footer.tsx`, incluindo `common.footer.tagline`).
- Revisar também `about.intro` e `about.missionSection` em `src/messages/pt-BR.json`, hoje escritos sem essas duas informações, e os metadados/`description` das páginas para refletir o posicionamento.
- **Texto estático via next-intl.** Não criar tabela para isso. `/quem-somos` permanece estática nesta fase (identidade + pilares + missão + seção de integrantes do B3).
- Aceite: as duas informações aparecem na home, em `/quem-somos` e no rodapé; o caráter evangelístico missionário está em posição de destaque, não escondido em texto secundário; nenhuma string hardcoded no componente.

#### A2. Contato: remover "quer fazer parte?"

- Ajustar `contact.subtitle` em `src/messages/pt-BR.json`. Hoje: "Tem alguma dúvida, convite ou quer fazer parte? Fale com a gente."
- Manter o tom acolhedor sem o convite a integrar o grupo.
- Aceite: `/contato` não sugere mais entrada no ministério.

#### A3. Linhas de tabela clicáveis no painel

- `/admin/events` (`src/modules/events/ui/views/events-admin-view.tsx`): clicar na linha abre o dialog de edição do evento.
- `/admin/albums` (`src/modules/albums/ui/views/albums-admin-view.tsx`): clicar na linha navega para `/admin/albums/{id}`; **remover** o ícone de galeria que hoje cumpre esse papel.
- Os botões de ação (editar, excluir) precisam parar a propagação do clique.
- Acessibilidade: linha precisa ser acionável por teclado (`role`/`tabIndex` + Enter/Espaço, ou um link cobrindo a célula principal). Não aninhar botão dentro de link.
- Aceite: clique na linha funciona, ações não disparam navegação indevida, foco visível e navegação por teclado preservada.

#### A4. Acesso ao site público a partir do painel

- Link semântico presente em **todas** as páginas do painel: colocar no `DashboardSidebar` (`src/modules/dashboard/ui/components/dashboard-sidebar.tsx`) e/ou no header do `src/app/admin/(dashboard)/layout.tsx`.
- Rótulo claro ("Ver site"), ícone de link externo, abre em nova aba (`target="_blank"` + `rel="noopener noreferrer"`).
- String em `dashboard.nav` no arquivo de mensagens.
- Aceite: em qualquer rota `/admin/*` existe um caminho de um clique para o site público.

#### A5. Corrigir o lightbox de fotos

Problema atual em `src/modules/albums/ui/components/photo-lightbox.tsx`: a foto abre pequena, como se estivesse num card transparente com padding enorme.

Causas a tratar:

- `DialogContent` recebe `max-w-3xl`, limitando a imagem bem abaixo da viewport.
- A imagem vive num wrapper de proporção fixa (`aspect-square` / `sm:aspect-4/3`) com `object-contain`: fotos em retrato ou panorâmicas sobram muito espaço vazio.
- `DialogOverlay` (`src/components/ui/dialog.tsx`) é `bg-black/10`, claro demais para galeria, o que reforça a sensação de "card flutuante".

Direção da correção:

- Container ocupando a viewport (algo como `max-h-[100dvh]`/`max-w-[100vw]` com padding mínimo), sem proporção fixa; a imagem se ajusta por `object-contain` respeitando altura e largura disponíveis.
- Escurecer o overlay só para o lightbox. Hoje `DialogOverlay` é renderizado dentro de `DialogContent` sem prop de classe — avaliar duas saídas: adicionar `overlayClassName` opcional ao `DialogContent` (mudança pequena e reaproveitável) ou montar o lightbox direto sobre os primitivos do Radix. Escolher uma e justificar.
- Manter navegação anterior/próxima, botão de fechar visível sobre a foto, legenda legível e `DialogTitle` acessível.
- Site público: só a foto (sem curtidas/comentários). Lightbox do painel (C3) pode reutilizar o mesmo container e acrescentar os controles.
- Aceite: foto retrato e foto paisagem ocupam o máximo possível da tela sem corte nem distorção, em mobile e desktop.

### Fase B — Conteúdo gerenciável (schema novo)

#### B1. Redes sociais no site público

- Exibir as redes no site público (rodapé como base; avaliar `/contato`).
- Gerenciáveis no painel por quem tiver `site:write`.
- Dados: nova tabela (ex.: `social_links`) com plataforma, rótulo, URL, ordem, publicado e ícone.
- Plataformas: lista fechada **Instagram, YouTube, Facebook, WhatsApp, Spotify** (ícone fixo do `lucide-react`) + **Outro** (URL e rótulo livres, ícone escolhido com busca na paleta do `lucide-react`). Sem `react-icons`.
- Validar URL com Zod.
- **Não** fazer backfill de `site:write` nos gestores atuais. Marcar na mão em `/admin/equipe`. No formulário de equipe, **legenda explicando cada capability**.
- Aceite: uma rede cadastrada e publicada aparece no site público; despublicada some; quem não tem `site:write` não vê a tela nem consegue chamar as procedures.

#### B2. Mensagens de contato no painel

- Nova página no painel para ver e gerenciar o que chega pelo formulário de `/contato`.
- Base já existe: tabela `contact_messages` e procedures `contact.listAll` / `contact.markAsRead` (`src/modules/contact/server/procedures.ts`), hoje sem tela. Falta `delete`.
- Funções: listar (não lidas primeiro), abrir/ler a mensagem completa, marcar como lida/não lida, excluir. Indicador de não lidas na navegação.
- Permissão: `contact:manage` (separada de `users:manage`). Atualizar as procedures, o card de mensagens do overview (`src/modules/dashboard/ui/views/dashboard-overview-view.tsx`) e o prefetch condicional em `src/app/admin/(dashboard)/page.tsx`. Sem backfill automático — marcar na mão em `/admin/equipe`.
- Aceite: quem tem `contact:manage` vê e gerencia; quem só tem agenda recebe `FORBIDDEN` e não enxerga o item no menu.

#### B3. Integrantes do ministério em "Quem somos"

Seção nova na **página estática** `/quem-somos` (`about-view.tsx`), não um bloco de CMS.

Conta de login ≠ integrante ≠ aparição na página. Dois controles, ambos só com `users:manage`:

1. **É integrante** — faz parte do ministério (perfil, função, autoedição).
2. **Mostrar em Quem somos** — entra na grade pública. Pode ser da equipe e não aparecer no site.

Criar em `/admin/equipe` **não** coloca a pessoa na página nem a marca como integrante por padrão. O admin faz isso depois.

Exibir no público (só quem está ativo, é integrante e com "mostrar" ligado): nome, função no ministério, foto (se houver) e depoimento (se houver).

- **Autoedição:** o próprio usuário logado altera nome, foto e depoimento em `/admin/perfil` (qualquer sessão, sem capability). Função desabilitada/oculta para quem não tem `users:manage`.
- **Função no ministério:** só `users:manage`.
- `users:manage` pode editar todos os campos de qualquer integrante.

Sair do ministério: o admin **escolhe desativar ou remover**.

- **Desativar:** não loga mais; some de "Quem somos" na hora; o interruptor "mostrar em Quem somos" é **desligado** (reativar **não** recoloca na página — o admin marca de novo); comentários e curtidas somem do painel **para todo mundo**, como se não tivessem existido.
- **Remover:** apaga a conta (e o perfil).

Implicações para o plano:

- Perfil em tabela 1:1 (ex.: `member_profiles` com `userId` PK/FK, função, foto, `storagePath`, depoimento, `isMember`, `showOnAbout`, ordem). Não inflar `user` em `auth-schema.ts` (CLI do better-auth tende a sobrescrever). Desativação da conta: campo na `user` ou equivalente do better-auth que impeça sessão nova e invalide as atuais.
- Criar o perfil junto em `createStaffUser` com `isMember` e `showOnAbout` falsos; backfill dos usuários existentes no mesmo estado.
- Upload de foto pelo padrão de `src/lib/storage.ts`, removendo o arquivo antigo ao trocar.
- Query pública: só ativos + integrante + mostrar, ordenados, sem e-mail nem dados sensíveis.
- Aceite: criar conta **não** aparece em `/quem-somos` até marcar os dois controles; autoedição não muda a função; desativar some da página e das interações no painel; reativar não recoloca na página sozinho.

#### B4. Editor de "Quem somos" — fora desta fase

Adiado. `/quem-somos` continua no `about-view` + `pt-BR.json`. SEO da página permanece nos metadados estáticos. Não criar `page_sections` nem rota `/admin/quem-somos`. Não usar `@dnd-kit` nesta fase.

### Fase C — Álbuns

#### C1. Sub-álbuns

- Hierarquia de **um nível** (álbum → sub-álbum). Sem `showAsRoot` / "promovido".
- Cada álbum tem `published` **independente** do pai. Rascunho **nunca** aparece no site público (nem em `/albuns`, nem como card dentro do pai).
- Lugar do card no público (só álbuns publicados):

  | Situação | Onde o card aparece |
  |---|---|
  | Sem pai | `/albuns`, como hoje |
  | Pai em rascunho | `/albuns` (card solto; o pai não está no ar) |
  | Pai publicado | **dentro da página do pai**, não na lista da frente |

- Em `/albuns`, contador sutil por card: fotos e sub-álbuns **publicados**.
- Dados: `albums.parentId` (auto-relacionamento). Definir `onDelete` do pai (cascatear ou orphanar filhos publicados) e recusar ciclo ao mover. Um nível: filho não pode ter filhos.
- Painel: escolher álbum pai no formulário; listagem com hierarquia legível. **Qualquer pessoa logada** vê rascunho e publicado (área interna). Criar/editar/apagar só com `albums:write`.
- Contagem eficiente (agregação, sem N+1).
- Aceite: filho publicado com pai rascunho vira card em `/albuns`; pai publicado mostra os filhos publicados como cards internos; rascunho invisível no público.

#### C2. Upload de fotos em duas etapas

- Hoje `AlbumPhotosAdminView` envia o arquivo imediatamente ao selecionar/colar.
- Novo fluxo: selecionar (ou colar) as imagens, revisar em uma fila com preview e, **para cada foto**, informar nome e descrição — ambos opcionais — e só então confirmar o envio.
- Permitir remover itens da fila antes de enviar e mostrar progresso por item.
- Dados: somar `photos.title`; **manter** `caption` como descrição. Ajustar `addPhotoSchema` em `src/modules/albums/schema.ts`.
- Aceite: nada sobe antes da confirmação; nome e descrição chegam ao banco; enviar sem preencher os textos continua funcionando.

#### C3. Curtidas e comentários nas fotos (só no painel)

- Site público: **somente as fotos**. Sem totais, sem comentários, sem convite para entrar.
- No painel: qualquer pessoa **logada** abre álbuns em modo leitura, curte e comenta, **sem aprovação**. Criar/editar/apagar álbum e foto continua `albums:write`.
- Dados: curtidas com unicidade foto + usuário; comentários com autor, texto, data, `deletedAt` (soft delete).
- Soft delete: some da UI padrão; quem tem `users:manage` **vê ocultos no próprio álbum** e pode restaurar ou apagar de vez. Sem painel extra. Comentários/curtidas de conta **desativada** não entram nessa lista — somem para todo mundo.
- Procedures: `protectedProcedure` para curtir/comentar (qualquer sessão); leitura no painel. Sem procedures públicas de like/comentário.
- UX: curtida otimista; contadores sem N+1; limite de tamanho via Zod.
- Aceite: visitante em `/albuns/[id]` não vê interação; no admin, qualquer logado curte/comenta; gestor restaura ou apaga de vez no próprio álbum; desativado some das interações.

---

## 4. Decisões fechadas

Fonte: `docs/lacunas.md`. O Plan **não pergunta de novo**.

| Tema | Decisão |
|---|---|
| Conta vs integrante vs página | Dois controles (`isMember`, `showOnAbout`); criar conta não marca nenhum |
| Quem marca os dois | Só `users:manage` |
| Função no ministério | Só `users:manage` |
| Sair | Desativar **ou** remover |
| Desativar | Não loga; some de Quem somos; desliga `showOnAbout`; reativar não recoloca; interações somem para todo mundo |
| Capabilities novas | `site:write` (redes) e `contact:manage` (mensagens) |
| Backfill das novas | Não; marcar na mão + legendas em `/admin/equipe` |
| `/quem-somos` | Estática nesta fase; editor adiado |
| Identidade (A1) | JSON agora, inclusive em `/quem-somos` |
| SEO de Quem somos | Metadados estáticos |
| Redes | Lista fechada + Outro; ícone Outro com busca no `lucide-react` |
| Curtir/comentar | Só no painel; público só fotos |
| Quem curte no painel | Qualquer logado; vê rascunho e publicado |
| Comentários | Sem aprovação; soft delete; restaurar/apagar no álbum só com `users:manage` |
| Sub-álbuns | Um nível; só `published`; sem promovido; lugar do card conforme tabela do C1 |
| Campos de foto | Somar `title`; manter `caption` |

---

## 5. Restrições

- Seguir `.cursor/rules/*.mdc`: stack fechada, arquitetura em módulos por domínio (`ui/views`, `ui/components`, `server/procedures.ts`, `schema.ts`, `types.ts`), tema preto/branco com acento `orange-400`, TypeScript tipado, i18n via next-intl.
- Não introduzir biblioteca fora de `stack.mdc`. **Não usar `@dnd-kit` nesta fase** (era para o editor adiado). Não adicionar `react-icons`.
- Rotas `/admin` permanecem como estão; não renomear nesta fase.
- Toda regra de permissão vale nos dois lados: a UI esconde, o tRPC recusa.
- Páginas em `app/` só orquestram (Suspense, prefetch, ErrorBoundary); lógica nas views dos módulos.
- Estados de carregando, vazio e erro em toda tela nova.
- Migrations com `pnpm db:push`; sempre planejar o backfill dos registros existentes.
- Fora do escopo: e-commerce, Supabase Auth, recursos de IA, cadastro público de usuários, editor de "Quem somos".

## 6. Formato esperado do plano

Entregue um plano com etapas na ordem A → B → C, e para cada etapa:

- arquivos a criar e a alterar, com caminho;
- mudanças de schema e o backfill correspondente;
- capabilities novas e onde são verificadas;
- chaves novas em `src/messages/pt-BR.json`;
- critério de aceite verificável.

Sinalize claramente o que pode ir para produção de forma independente, para que as fases sejam entregues em commits separados.
