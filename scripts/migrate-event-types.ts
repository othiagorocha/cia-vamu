import { config } from "dotenv";
import postgres from "postgres";

import { DEFAULT_EVENT_TYPES } from "../src/modules/events/event-types";

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

const columnExists = async (table: string, column: string) => {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
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

const typeExists = async (name: string) => {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typname = ${name}
    ) AS exists
  `;

  return Boolean(row?.exists);
};

async function main() {
  if (!(await tableExists("events"))) {
    throw new Error("Tabela events não encontrada.");
  }

  await sql`
    CREATE TABLE IF NOT EXISTS event_types (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL,
      label text NOT NULL,
      default_color text NOT NULL,
      is_system boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT event_types_slug_unique UNIQUE (slug)
    )
  `;

  for (const type of DEFAULT_EVENT_TYPES) {
    await sql`
      INSERT INTO event_types (slug, label, default_color, is_system, sort_order)
      VALUES (
        ${type.slug},
        ${type.label},
        ${type.defaultColor},
        ${type.isSystem},
        ${type.sortOrder}
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  }

  if (!(await columnExists("events", "type_id"))) {
    await sql`ALTER TABLE events ADD COLUMN type_id uuid`;
  }

  if (await columnExists("events", "type")) {
    await sql`
      UPDATE events AS e
      SET type_id = t.id
      FROM event_types AS t
      WHERE e.type_id IS NULL AND e.type::text = t.slug
    `;
  }

  await sql`
    UPDATE events AS e
    SET type_id = t.id
    FROM event_types AS t
    WHERE e.type_id IS NULL AND t.slug = 'outro'
  `;

  const [pending] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM events WHERE type_id IS NULL
  `;

  if (Number(pending?.count ?? 0) > 0) {
    throw new Error(
      "Ainda há eventos sem type_id. Abortando para não perder dados.",
    );
  }

  await sql`ALTER TABLE events ALTER COLUMN type_id SET NOT NULL`;

  if (!(await constraintExists("events_type_id_event_types_id_fk"))) {
    await sql`
      ALTER TABLE events
      ADD CONSTRAINT events_type_id_event_types_id_fk
      FOREIGN KEY (type_id) REFERENCES event_types(id)
      ON DELETE RESTRICT
    `;
  }

  await sql`
    CREATE INDEX IF NOT EXISTS events_type_id_idx ON events (type_id)
  `;

  if (await columnExists("events", "type")) {
    await sql`ALTER TABLE events DROP COLUMN type`;
  }

  if (await typeExists("event_type")) {
    await sql`DROP TYPE event_type`;
  }

  if (
    (await constraintExists("event_types_slug_key")) &&
    !(await constraintExists("event_types_slug_unique"))
  ) {
    await sql`
      ALTER TABLE event_types
      RENAME CONSTRAINT event_types_slug_key TO event_types_slug_unique
    `;
  }

  console.log("Migração de tipos de agenda concluída.");
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Falha na migração de tipos de agenda:", error);
    await sql.end({ timeout: 5 }).catch(() => undefined);
    process.exit(1);
  });
