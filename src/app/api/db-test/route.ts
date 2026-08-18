import { createHash, timingSafeEqual } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { account, user } from "@/db/auth-schema";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico temporário de auth/banco (Hostinger → Supabase).
 * Remover depois do teste.
 *
 * Aceita DIAGNOSTIC_TOKEN no ambiente, ou o token temporário abaixo
 * (só para este deploy de investigação).
 */
const FALLBACK_DIAGNOSTIC_TOKEN =
  "293c93b783edb5907cf732119c946ee929762ec923d9666a";

const isAuthorized = (token: string | null) => {
  const expectedToken =
    process.env.DIAGNOSTIC_TOKEN ?? FALLBACK_DIAGNOSTIC_TOKEN;

  if (!expectedToken || !token) {
    return false;
  }

  const provided = createHash("sha256").update(token).digest();
  const expected = createHash("sha256").update(expectedToken).digest();

  return timingSafeEqual(provided, expected);
};

const fingerprint = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 8);

const describeConnection = () => {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    return { configured: false as const };
  }

  try {
    const url = new URL(raw);

    return {
      configured: true as const,
      host: url.hostname,
      port: url.port,
      database: url.pathname.replace(/^\//, ""),
      role: url.username,
      passwordFingerprint: url.password ? fingerprint(url.password) : null,
    };
  } catch {
    return { configured: true as const, host: "url-invalida" };
  }
};

type ServerInfoRow = {
  database: string;
  role: string;
  schema: string | null;
  server: string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token =
    request.headers.get("x-diagnostic-token") ?? url.searchParams.get("token");

  if (!isAuthorized(token)) {
    // Mantém o smoke-test antigo sem token, só com SELECT now().
    try {
      const result = await db.execute(sql`select now() as now`);
      const row = result[0] as { now?: string } | undefined;

      return NextResponse.json({
        ok: true,
        database: "connected",
        time: row?.now ?? null,
      });
    } catch (error) {
      const err = error as { message?: string };

      return NextResponse.json(
        { ok: false, error: err.message ?? "db error" },
        { status: 500 },
      );
    }
  }

  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? null;

  try {
    const serverInfo = (await db.execute(sql`
      select
        current_database() as database,
        current_user as role,
        current_schema() as schema,
        inet_server_addr()::text as server
    `)) as unknown as ServerInfoRow[];

    const users = await db
      .select({
        id: user.id,
        email: user.email,
        disabled: user.disabled,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.createdAt);

    const match = email
      ? await db.select().from(user).where(eq(user.email, email))
      : [];

    const accounts = match[0]
      ? await db
          .select({
            providerId: account.providerId,
            hasPassword: sql<boolean>`(${account.password} is not null)`,
            passwordPrefix: sql<string | null>`left(${account.password}, 7)`,
            passwordLength: sql<number>`coalesce(length(${account.password}), 0)`,
          })
          .from(account)
          .where(eq(account.userId, match[0].id))
      : [];

    const adapter = await (await import("@/lib/auth")).auth.$context;
    const adapterLookup = email
      ? await adapter.internalAdapter.findUserByEmail(email, {
          includeAccounts: true,
        })
      : null;

    return NextResponse.json({
      ok: true,
      env: {
        nodeEnv: process.env.NODE_ENV,
        betterAuthUrl: process.env.BETTER_AUTH_URL ?? null,
        secretFingerprint: process.env.BETTER_AUTH_SECRET
          ? fingerprint(process.env.BETTER_AUTH_SECRET)
          : null,
      },
      connection: describeConnection(),
      server: serverInfo[0] ?? null,
      users: {
        total: users.length,
        rows: users.map((row) => ({
          id: row.id,
          email: JSON.stringify(row.email),
          disabled: row.disabled,
          createdAt: row.createdAt,
        })),
      },
      lookup: email
        ? {
            email,
            found: match.length > 0,
            adapterFound: Boolean(adapterLookup),
            adapterAccounts:
              adapterLookup?.accounts.map((item) => item.providerId) ?? [],
            accounts,
          }
        : null,
    });
  } catch (error) {
    const err = error as { name?: string; message?: string; code?: string };

    console.error("AUTH DIAGNOSTIC", err);

    return NextResponse.json(
      {
        ok: false,
        connection: describeConnection(),
        error: { name: err.name, message: err.message, code: err.code },
      },
      { status: 500 },
    );
  }
}
