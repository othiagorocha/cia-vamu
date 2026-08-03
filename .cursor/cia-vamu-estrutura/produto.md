# Produto — CIA VAMU

## Identidade

- **Nome:** CIA VAMU  
- **Sigla:** Visão, Arte, Missão, Unção  
- **Tipo:** site institucional de ministério (teatro, viagens, evangelismos e eventos)  
- **Diretório do app:** `cia-vamu`  

## Públicos

1. **Visitantes** — site público (conteúdo, álbuns, agenda, contato).  
2. **Equipe (admin)** — área autenticada para gerenciar agenda, álbuns e (opcionalmente) conteúdo de “Quem somos”.  

## Escopo MVP (implementar)

| Área | Descrição |
|------|-----------|
| Home | Apresentação da CIA VAMU, destaques de álbuns e próximos eventos |
| Quem somos | História / missão / visão / valores (conteúdo estático bem feito ou editável no admin) |
| Entre em contato | Formulário (nome, e-mail, mensagem) com Zod + toast |
| Álbuns / Galeria | Fotos do trabalho por álbum (lista → detalhe → grid/lightbox) |
| Agenda | Próximos eventos (teatro, viagens, evangelismos, etc.) com data, local, tipo e descrição |
| Admin | CRUD de eventos, álbuns e fotos; opcionalmente conteúdo “Quem somos” |

## Feature futura (não implementar no MVP)

- **Compra de produtos** (e-commerce).  
- Preparar apenas placeholder de módulo `products` na arquitetura — sem checkout.

## Rotas públicas

| Rota | Página |
|------|--------|
| `/` | Home |
| `/quem-somos` | Quem somos |
| `/contato` | Contato |
| `/albuns` | Lista de álbuns |
| `/albuns/[albumId]` | Fotos do álbum |
| `/agenda` | Eventos públicos |

## Rotas admin (protegidas)

| Rota | Página |
|------|--------|
| `/sign-in` | Login (sign-up só se necessário; preferir seed de admin) |
| `/dashboard` | Overview |
| `/dashboard/events` | CRUD agenda |
| `/dashboard/albums` | CRUD álbuns e fotos |

## Critérios de qualidade

- Tipagem TypeScript forte  
- Validação Zod em forms e procedures  
- Estados loading / empty / error  
- UI e strings em **pt-BR** (next-intl)  
- Responsivo mobile-first  
- Acessibilidade básica (contraste, labels, focus)  
