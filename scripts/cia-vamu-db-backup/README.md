# Backup CIA VAMU (banco + fotos)

Exporta o Postgres (JSON + SQL) e baixa o bucket do Supabase Storage para:

`C:\Users\thiag\Documents\backup\cia-vamu-database-backup\<timestamp>\`

## Aviso

O dump inclui tabelas de auth (`user`, `account`, …) com **hashes de senha**.
Mantenha só na sua máquina; não versionar nem compartilhar.

## Uso

Na raiz do projeto (com `.env.local` preenchido):

```bash
pnpm backup:cia-vamu
```

Opcional: outro destino com `BACKUP_DIR`:

```bash
BACKUP_DIR="D:/backups/cia-vamu" pnpm backup:cia-vamu
```

## Saída

```text
<timestamp>/
  manifest.json
  database/
    data.json
    data.sql
    schema.sql
  storage/
    ...arquivos do bucket...
    _index.json
```

- **JSON:** todas as tabelas do app + auth.
- **SQL:** `pg_dump` se estiver no PATH; senão INSERTs (`data.sql`) e `schema.sql` apontando para `pnpm db:push`.

## Restore (manual)

1. Schema: `pnpm db:push` (ou `schema.sql` se veio do `pg_dump`).
2. Dados: `psql "$DATABASE_URL" -f database/data.sql` (ou importar `data.json`).
3. Fotos: reenviar o conteúdo de `storage/` para o bucket `SUPABASE_STORAGE_BUCKET`.
