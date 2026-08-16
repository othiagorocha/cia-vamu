# Questionário — lacunas da Fase 2

Marque uma opção por pergunta (`[x]`). A primeira opção de cada item é a recomendada, salvo quando a dica disser o contrário.

---

Quem criado em `/admin/equipe` aparece em "Quem somos"?
Todo integrante precisa de login para autoeditar nome, foto e depoimento. Conta sem perfil (ou perfil sem conta) aumenta o modelo.

[] Toda conta vira integrante e aparece por padrão; dá para ocultar depois
[] Dá para criar integrante sem login e conta que não aparece no site
[] Só aparece quem for marcado explicitamente na criação
[x] quem vai criar os integrantes serão os admins; posteriormente eles poderão coloca-los como integrantes ou não e colocar na página "Quem somos" ou não.

---

Se alguém sai do ministério, o que o admin faz?
Remover a conta tira login, autoedição e histórico de comentários. Ocultar o perfil mantém o acesso ao painel.

[] Só oculta o perfil no site público; a conta continua existindo
[] Remove a conta (e o perfil some junto)
[] Os dois: ocultar no dia a dia e remover só quando for o 
[x] ele poderá escolher entre desativar ou remover a conta; integrantes desativados não poderão mais logar e todas as suas interações no site admin deverão ser ocultadas (comentários, curtidas, etc.)

---

Quem pode alterar a função do integrante no ministério?
Hoje "admin" não é uma capability. Precisa amarrar a uma permissão real.

[x] Quem tem `users:manage` (quem já gerencia a equipe)
[] Quem tem `site:write` (quem edita o conteúdo institucional)
[] Qualquer um dos dois

---

Criar capabilities novas (`site:write` e `contact:manage`)?
Separar evita que quem só cuida da agenda veja mensagens de contato ou edite o site.

[x] Sim: `site:write` para redes/"Quem somos" e `contact:manage` para mensagens
[] Não: tudo continua em `users:manage`

---

Gestores atuais devem ganhar as capabilities novas no backfill?
Sem isso, quem já é gestor perde telas novas até alguém marcar na equipe.

[] Sim, quem já tem `users:manage` recebe `site:write` e `contact:manage`
[x] Não; marcar na mão em `/admin/equipe`. Colocar também, em /admin/equipe, uma legenda expplicando cada capacidade.

---

A1 (identidade no JSON) versus B4 (editor no banco) em `/quem-somos`
A1 pede texto estático; B4 depois move o conteúdo para o banco. Home e rodapé continuam no JSON.

[] A1 vale para home/rodapé/metadados; o texto de `/quem-somos` já nasce como seed do editor
[x] Fazer A1 no JSON agora e migrar de novo quando o editor existir
[] Pular A1 em `/quem-somos` e só escrever identidade no editor

---

Se todos os blocos de "Quem somos" estiverem despublicados
Salvar já publica, mas um bloco pode ficar `published: false`.

[] Manter um hero mínimo seedado que não pode ser apagado, só editado
[] Página vazia com empty state institucional
[] Impedir despublicar o último bloco 
[x] Manter o que aparece hoje 

---

Título e descrição SEO de `/quem-somos` depois do editor
Hoje vêm do next-intl. Com conteúdo no banco, precisa de fonte.

[] Campos de SEO na própria página (título e description), editáveis no painel
[] Continuar nos metadados estáticos do next-intl
[] Usar o título/texto do bloco hero publicado

---

Onde o integrante entra para curtir e comentar no site público?
Cadastro público continua desligado. Só existe `/admin/login`.

[] Mesmo `/admin/login`, e depois volta para a foto/álbum
[] Tela de login mínima no site público (sem cadastro)
[] Não precisa login no público nesta fase; curtidas/comentários ficam só no painel
[x] apos o login, ainda na area administrativa, ele poderá acessar os albuns e fotos, e curtir e comentar nas fotos. Somente na area administrativa, no site publico exibir somente as fotos.

---

Comentários nas fotos publicam como?
Visitante sem sessão só vê totais; quem tem login comenta.

[] Publicam na hora; autor e quem tem permissão podem apagar
[] Ficam ocultos até um admin aprovar
[] Sem comentários nesta fase; só curtidas
[x] nenhum comentário devera ser exibido no site publico, apenas na area administrativa. Quem tem conta poderá comentar e ver os comentários, sem aprovação prévia do admin.

---

Excluir comentário
Afeta moderação e histórico.

[] Exclusão definitiva
[x] Ocultar (soft delete), some do site admin e continua no banco de dados

---

Profundidade dos sub-álbuns
Aninhar sem limite complica ciclo, contadores e URL.

[x] Só um nível (álbum → sub-álbum)
[] Aninhar sem limite

---

Sub-álbum promovido (`showAsRoot`) cujo pai está despublicado
O sinalizador de "aparecer em `/albuns`" precisa de regra clara.

[x] Aparece em `/albuns` mesmo com o pai despublicado
[] Só aparece se o pai também estiver publicado
[] Promovido ignora o pai; cada álbum tem `published` próprio e basta ele

---

Campos da foto (hoje só existe `caption`)
Nome e descrição no upload em duas etapas.

[x] Somar `title` e manter `caption` como descrição
[] Renomear `caption` → `description` (migration com os dados) e somar `title`

---

Plataformas de rede social no painel
Ícones do `lucide-react` por plataforma.

[] Lista fechada: Instagram, YouTube, Facebook, WhatsApp, Spotify
[x] Lista fechada acima + campo "Outro" com URL e rótulo livre. Ter a opção de escolher o ícone caso não seja as da lista fechada.
[] Só URL e rótulo, sem plataforma pré-definida

---

## Rodada 2 — só o que ainda ficou ambíguo

Marque uma opção (`[x]`). A primeira é a recomendada.

---

Conta de login, integrante do ministério e aparição em "Quem somos" são a mesma coisa?
Você disse que o admin cria a pessoa e depois decide se ela é integrante e se entra na página. Isso pode ser um único interruptor ou dois.

[x] Dois controles: "é integrante" e "mostrar em Quem somos" (dá para ser da equipe e não aparecer no site)
[] Um só: se marcar como integrante, entra em "Quem somos"; desmarcar tira da página
[] Três estados na equipe: só login / integrante oculto / integrante visível na página

---

Conta desativada some de "Quem somos"?
Desativado não loga e as interações somem do painel. Falta o efeito no site público.

[x] Sim: some da página na hora, como se não fosse mais integrante visível
[] Não: continua na página até o admin tirar na mão
[] Some da página e o perfil fica marcado como oculto, para não voltar sozinho se reativar

---

Comentários e curtidas de conta desativada
No painel, os outros integrantes ainda veem o que essa pessoa fez?

[x] Não: some para todo mundo (como se não tivesse existido)
[] Sim, mas só quem tem `users:manage`, com indicação de conta desativada

---

Comentário com soft delete pode ser restaurado nesta fase?
Você já escolheu manter no banco e esconder na UI.

[] Não: some da UI e fica só no banco, sem tela de restaurar
[x] Sim: quem tem `users:manage` vê ocultos e pode restaurar ou deletar definitivamente em um painel separado.

---

Título e descrição SEO de `/quem-somos` depois do editor
Nenhuma opção da rodada 1 foi marcada.

[] Continuar nos metadados estáticos do next-intl (não editável no painel nesta fase)
[] Campos de SEO editáveis no painel (título e description da página)
[] Usar o título/texto do bloco hero 
[x] manter a edição da página quem somos descartada por ora. vamos manter estatica e pensar em algo em uma fase futura.

---

Ícone da rede social "Outro"
A lista fechada (Instagram, YouTube, Facebook, WhatsApp, Spotify) já tem ícone. "Outro" precisa de escolha.

[] Paleta pequena e fixa do `lucide-react` (globo, link, play, câmera, coração, música)
[x] paleta lucide e react icons, com campos de pesquisa da rede social para escolher o ícone.
[] As mesmas da lista fechada, reutilizáveis no "Outro"
[] Sem escolha de ícone: "Outro" usa sempre o ícone de link/globo

---

Sub-álbum promovido ainda precisa estar publicado nele mesmo?
O pai despublicado não impede a listagem. Falta a regra do próprio álbum.

[] Sim: só entra em `/albuns` se `published` dele for verdadeiro
[] Não: `showAsRoot` sozinho já publica na listagem
[x] se o pai estiver despublicado, o sub-álbum também não deverá ser listado, a menos que seja promovido.

---

## Rodada 3 — o que ainda precisa de desempate

A rodada 2 fechou bastante coisa (incluindo **tirar o editor de "Quem somos" desta fase**). Marque `[x]` só nestas.

---

Ao reativar uma conta, ela volta a aparecer em "Quem somos"?
Na desativação ela some na hora. O interruptor "mostrar em Quem somos" pode continuar ligado.

[x] Não: desativar desliga "mostrar em Quem somos"; reativar não recoloca na página, vai ter que colocar explicitamente 
[] Sim: volta com o mesmo estado de antes (se estava visível, reaparece)

---

Quem marca "é integrante" e "mostrar em Quem somos"?
São dois controles. Função no ministério já ficou com `users:manage`.

[x] Os dois controles só com `users:manage`
[] "É integrante" com `users:manage`; "mostrar em Quem somos" com `site:write`

---

Quem, no painel, vê álbuns só para curtir e comentar?
Hoje a tela de álbuns exige `albums:write` (quem edita). Você pediu curtida/comentário no admin para quem tem conta.

[x] Qualquer pessoa logada entra nos álbuns em modo leitura + curtir/comentar; criar/editar/apagar continua só com `albums:write`
[] Só quem tem `albums:write` curte e comenta
[] Só quem está marcado como integrante (mesmo sem `albums:write`) vê álbuns nesse modo leitura

---

`react-icons` não está na stack do projeto (só `lucide-react`). Busca em todos os ícones vira um produto à parte.
A lista fechada (Instagram, YouTube, Facebook, WhatsApp, Spotify) continua com ícone fixo.

[x] Só `lucide-react`, com campo de busca nessa paleta (sem biblioteca nova)
[] Incluir `react-icons` na stack, busca limitada a um pacote (ex.: Simple Icons)
[] Esquece a busca: paleta pequena e fixa (globo, link, play, câmera, coração, música)

---

Sub-álbum promovido precisa estar `published` nele mesmo para entrar em `/albuns`?
Pai despublicado esconde os filhos, **exceto** os promovidos. Falta a regra do próprio filho.

[] Sim: promovido + `published` verdadeiro
[] Não: promovido aparece mesmo despublicado
[x] se o pai estiver despublicado, listar somente os sub-albuns promovidos.

---

Painel separado de comentários ocultos (restaurar ou apagar de vez)
Quem tem `users:manage` acessa. Comentários de conta desativada já somem "como se não existissem".

[] O painel lista só o que alguém ocultou na mão, não os de conta desativada
[] Lista também os de conta desativada, para restaurar ou apagar de vez
[x] Sem painel extra: restaurar/apagar fica no próprio álbum, visível só para `users:manage`

---

## Rodada 4 — duas regras ainda sem exemplo concreto

O resto da rodada 3 está fechado. Nestas duas, a resposta precisa ser sim ou não sobre o caso descrito.

---

Caso: o álbum pai está publicado. O sub-álbum está **promovido** e com `published` desligado. Ele aparece em `/albuns`?
Isso é o interruptor do **próprio** álbum, não o do pai. "Promovido" só diz se entra na listagem principal; `published` diz se está no ar.

[x] Não: despublicado nunca entra em `/albuns` (nem dentro do pai). Não existe interruptor "promovido": o lugar do card é só consequência do pai estar ou não no ar.
[] Sim: promovido aparece mesmo com `published` desligado

Regra fechada:

- Cada álbum tem só `published`, com ou sem pai.
- Rascunho nunca aparece no site público.
- Filho publicado + pai em rascunho → card solto em `/albuns`.
- Filho publicado + pai publicado → card dentro da página do pai (não na lista da frente).
- Álbum publicado sem pai → card em `/albuns`, como hoje.

---

Quem não tem `albums:write` vê álbuns ainda não publicados, no painel?
Qualquer logado já vai entrar nos álbuns em modo leitura para curtir/comentar.

[x] Sim: no painel todo mundo logado vê rascunho e publicado (é área interna)
[] Não: sem `albums:write` só vê o que já está publicado no site



