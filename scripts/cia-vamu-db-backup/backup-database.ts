import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

import {
  TABLE_ORDER,
  type BackupConfig,
  type BackupTableName,
} from "./config";
import { quoteIdent, sqlLiteral } from "./sql-escape";

export type DatabaseBackupResult = {
  jsonPath: string;
  dataSqlPath: string;
  schemaSqlPath: string;
  tableCounts: Record<string, number>;
  sqlMode: "pg_dump" | "insert_fallback";
  pgDumpError?: string;
  referencedStoragePaths: string[];
};

type Row = Record<string, unknown>;

const serializeJsonValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Buffer.isBuffer(value)) {
    return { type: "Buffer", data: [...value] };
  }

  if (Array.isArray(value)) {
    return value.map(serializeJsonValue);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(record)) {
      out[key] = serializeJsonValue(nested);
    }

    return out;
  }

  return value;
};

const collectStoragePaths = (tables: Record<string, Row[]>) => {
  const paths = new Set<string>();

  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      paths.add(value.trim());
    }
  };

  for (const row of tables.photos ?? []) {
    add(row.storage_path);
  }

  for (const row of tables.events ?? []) {
    add(row.storage_path);
  }

  for (const row of tables.member_profiles ?? []) {
    add(row.storage_path);
  }

  for (const row of tables.albums ?? []) {
    const cover = row.cover_image_url;

    if (typeof cover === "string") {
      const marker = "/storage/v1/object/public/";
      const index = cover.indexOf(marker);

      if (index >= 0) {
        const after = cover.slice(index + marker.length);
        const slash = after.indexOf("/");

        if (slash >= 0) {
          add(after.slice(slash + 1));
        }
      }
    }
  }

  return [...paths].sort();
};

const buildInsertSql = (table: BackupTableName, rows: Row[]) => {
  if (rows.length === 0) {
    return `-- ${table}: 0 rows\n`;
  }

  const columns = Object.keys(rows[0] ?? {});
  const quotedTable = quoteIdent(table);
  const quotedColumns = columns.map(quoteIdent).join(", ");
  const lines: string[] = [`-- ${table}: ${rows.length} rows`];

  for (const row of rows) {
    const values = columns.map((column) => sqlLiteral(row[column])).join(", ");
    lines.push(
      `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${values});`,
    );
  }

  lines.push("");
  return lines.join("\n");
};

const tryPgDump = (
  config: BackupConfig,
  schemaSqlPath: string,
  dataSqlPath: string,
) => {
  const schema = spawnSync(
    "pg_dump",
    [
      config.databaseUrl,
      "--schema-only",
      "--no-owner",
      "--no-privileges",
      "--file",
      schemaSqlPath,
    ],
    { encoding: "utf8" },
  );

  if (schema.status !== 0) {
    return {
      ok: false as const,
      error:
        schema.stderr?.trim() ||
        schema.error?.message ||
        `pg_dump schema exit ${schema.status}`,
    };
  }

  const data = spawnSync(
    "pg_dump",
    [
      config.databaseUrl,
      "--data-only",
      "--inserts",
      "--no-owner",
      "--no-privileges",
      "--file",
      dataSqlPath,
    ],
    { encoding: "utf8" },
  );

  if (data.status !== 0) {
    return {
      ok: false as const,
      error:
        data.stderr?.trim() ||
        data.error?.message ||
        `pg_dump data exit ${data.status}`,
    };
  }

  return { ok: true as const };
};

const FALLBACK_SCHEMA_SQL = `-- CIA VAMU — schema não gerado via pg_dump neste ambiente.
-- Para restaurar a estrutura das tabelas, use o schema Drizzle do projeto:
--   pnpm db:push
-- Depois aplique database/data.sql (INSERTs) ou importe database/data.json.
`;

export const backupDatabase = async (
  config: BackupConfig,
): Promise<DatabaseBackupResult> => {
  await mkdir(config.databaseDir, { recursive: true });

  const sql = postgres(config.databaseUrl, {
    prepare: false,
    max: 1,
    connect_timeout: 20,
  });

  const tables: Record<string, Row[]> = {};
  const tableCounts: Record<string, number> = {};

  try {
    for (const table of TABLE_ORDER) {
      const rows = await sql.unsafe(`SELECT * FROM ${quoteIdent(table)}`);
      const normalized = (rows as Row[]).map(
        (row) => serializeJsonValue(row) as Row,
      );
      tables[table] = normalized;
      tableCounts[table] = normalized.length;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  const jsonPath = path.join(config.databaseDir, "data.json");
  const dataSqlPath = path.join(config.databaseDir, "data.sql");
  const schemaSqlPath = path.join(config.databaseDir, "schema.sql");

  const payload = {
    exportedAt: config.exportedAt,
    database: new URL(config.databaseUrl).pathname.replace(/^\//, ""),
    tables,
  };

  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const dump = tryPgDump(config, schemaSqlPath, dataSqlPath);
  let sqlMode: DatabaseBackupResult["sqlMode"] = "pg_dump";
  let pgDumpError: string | undefined;

  if (!dump.ok) {
    sqlMode = "insert_fallback";
    pgDumpError = dump.error;

    await writeFile(schemaSqlPath, FALLBACK_SCHEMA_SQL, "utf8");

    const insertParts = [
      `-- CIA VAMU data dump (INSERT fallback)`,
      `-- exportedAt: ${config.exportedAt}`,
      `-- pg_dump indisponível: ${pgDumpError}`,
      `BEGIN;`,
      ``,
    ];

    for (const table of TABLE_ORDER) {
      insertParts.push(buildInsertSql(table, tables[table] ?? []));
    }

    insertParts.push(`COMMIT;`, ``);
    await writeFile(dataSqlPath, insertParts.join("\n"), "utf8");
  }

  return {
    jsonPath,
    dataSqlPath,
    schemaSqlPath,
    tableCounts,
    sqlMode,
    pgDumpError,
    referencedStoragePaths: collectStoragePaths(tables),
  };
};
