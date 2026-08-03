# Comando de Commit

Cria commits no padrão **Conventional Commits** em **pt-BR**.

Se o usuário enviar só `/commit`, analise o diff e crie um commit adequado.

## Formato

```
tipo(escopo opcional): descrição
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Exemplos

```
feat(events): permite upload de arte nos eventos
fix(auth): corrige esgotamento do pool do Postgres
docs: atualiza README de setup do Supabase
chore: ajusta eslint para Next 15
```

## Regras

- Mensagem curta, em pt-BR, focada no **porquê**
- Não commitar `.env.local`, secrets ou credenciais
- Seguir o protocolo de commit do Agent (status, diff, log, staging, HEREDOC, status final)
- Não usar `--no-verify` nem amend, salvo pedido explícito
