/** Converte um valor JS (vindo do postgres.js) em literal SQL. */
export const sqlLiteral = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "NULL";
    }

    return String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return `'${value.toISOString().replace(/'/g, "''")}'`;
  }

  if (Buffer.isBuffer(value)) {
    return `'\\x${value.toString("hex")}'`;
  }

  if (Array.isArray(value)) {
    // text[] / arrays simples: formato Postgres ARRAY[literal, ...]
    if (value.length === 0) {
      return "'{}'";
    }

    const allScalar = value.every(
      (item) =>
        item === null ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
    );

    if (allScalar) {
      return `ARRAY[${value.map((item) => sqlLiteral(item)).join(", ")}]`;
    }

    return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
  }

  if (typeof value === "object") {
    return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
  }

  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
};

export const quoteIdent = (identifier: string) =>
  `"${identifier.replace(/"/g, '""')}"`;
