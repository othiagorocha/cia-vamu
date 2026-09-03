import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", override: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida no ambiente.");
}

const sql = postgres(connectionString, {
  prepare: false,
  max: 1,
});

const tableExists = async (table: string) => {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS exists
  `;

  return Boolean(row?.exists);
};

const constraintExists = async (name: string) => {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = ${name}
    ) AS exists
  `;

  return Boolean(row?.exists);
};

async function main() {
  if (!(await tableExists("events"))) {
    throw new Error("Tabela events não encontrada.");
  }

  await sql`
    CREATE TABLE IF NOT EXISTS event_likes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT event_likes_event_user UNIQUE (event_id, user_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      author_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      body text NOT NULL,
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_comment_mentions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id uuid NOT NULL REFERENCES event_comments(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT event_comment_mentions_comment_user UNIQUE (comment_id, user_id)
    )
  `;

  if (!(await constraintExists("event_comment_mentions_comment_id_idx"))) {
    await sql`
      CREATE INDEX event_comment_mentions_comment_id_idx
      ON event_comment_mentions (comment_id)
    `;
  }

  console.log("Migração social da agenda concluída.");
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Falha na migração social da agenda:", error);
    await sql.end({ timeout: 5 }).catch(() => undefined);
    process.exit(1);
  });
