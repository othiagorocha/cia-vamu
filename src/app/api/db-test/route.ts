import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

type PostgresLikeError = {
  name?: string;
  message?: string;
  code?: string;
  errno?: string | number;
  cause?: PostgresLikeError;
};

const toDiagnosticError = (error: unknown) => {
  const err = error as PostgresLikeError;

  return {
    name: err.name,
    message: err.message,
    code: err.code,
    errno: err.errno,
    cause: err.cause?.message,
    causeCode: err.cause?.code,
  };
};

/**
 * Diagnóstico temporário de conectividade Postgres (Hostinger → Supabase).
 * Remover depois do teste: não deve ficar pública.
 */
export async function GET() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL não definida" },
      { status: 500 },
    );
  }

  const sql = postgres(connectionString, {
    prepare: false,
    connect_timeout: 10,
    max: 1,
  });

  try {
    const result = await sql`SELECT now()`;

    return NextResponse.json({
      ok: true,
      database: "connected",
      time: result[0]?.now,
    });
  } catch (error) {
    const diagnostic = toDiagnosticError(error);

    console.error("DB DIAGNOSTIC", {
      name: diagnostic.name,
      message: diagnostic.message,
      code: diagnostic.code,
      errno: diagnostic.errno,
      cause: error instanceof Error && error.cause
        ? toDiagnosticError(error.cause)
        : undefined,
    });

    return NextResponse.json(
      {
        ok: false,
        error: diagnostic,
      },
      { status: 500 },
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
