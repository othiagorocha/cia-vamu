import { createHash, timingSafeEqual } from "node:crypto";

import { count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { account, user } from "@/db/auth-schema";
import { albums, events } from "@/db/schema";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico temporário: o que o processo da Hostinger enxerga no Postgres
 * vs o que o Better Auth encontra no login.
 *
 * Sem token → só smoke `SELECT now()` (compatível com o endpoint antigo).
 * Com token → diagnóstico completo.
 *
 * Token: header `x-diagnostic-token`, query `?token=`, env `DIAGNOSTIC_TOKEN`
 * ou o fallback abaixo (remover a rota depois do teste).
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
      port: url.port || null,
      database: url.pathname.replace(/^\//, ""),
      role: url.username,
      passwordFingerprint: url.password ? fingerprint(url.password) : null,
      urlFingerprint: fingerprint(raw),
    };
  } catch {
    return { configured: true as const, host: "url-invalida" as const };
  }
};

const asRows = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  return [];
};

type CountRow = { n: number };
type ServerInfoRow = {
  database: string;
  role: string;
  schema: string | null;
  server: string | null;
};
type TableRow = { table_schema: string; table_name: string };

const buildVerdict = (input: {
  albums: number;
  events: number;
  usersRaw: number;
  usersDrizzle: number;
  email: string | null;
  drizzleFound: boolean;
  adapterFound: boolean;
  hasCredential: boolean;
}) => {
  if (input.albums > 0 && input.usersRaw === 0) {
    return {
      code: "CONTENT_WITHOUT_USERS",
      message:
        "Há álbuns neste banco, mas a tabela \"user\" está vazia. Login sempre falha com User not found.",
    };
  }

  if (input.usersRaw > 0 && input.usersDrizzle === 0) {
    return {
      code: "DRIZZLE_USER_MISMATCH",
      message:
        "SQL bruto vê usuários, mas o Drizzle não. Problema no schema/adapter do Better Auth neste runtime.",
    };
  }

  if (input.email && input.drizzleFound && !input.adapterFound) {
    return {
      code: "ADAPTER_LOOKUP_FAIL",
      message:
        "Drizzle acha o e-mail, mas internalAdapter.findUserByEmail não. Bug no caminho do Better Auth.",
    };
  }

  if (input.email && input.adapterFound && !input.hasCredential) {
    return {
      code: "MISSING_CREDENTIAL",
      message:
        "Usuário encontrado, mas sem account provider=credential (ou sem hash).",
    };
  }

  if (input.email && !input.drizzleFound && input.usersRaw > 0) {
    return {
      code: "EMAIL_NOT_IN_THIS_DB",
      message:
        "Este banco tem usuários, mas não este e-mail. Cadastro pode ter ido para outro ambiente.",
    };
  }

  if (input.email && input.adapterFound && input.hasCredential) {
    return {
      code: "USER_VISIBLE",
      message:
        "Usuário e credential visíveis neste processo. Se o login ainda falhar, o problema é senha/hash ou cookie/URL — não User not found.",
    };
  }

  return {
    code: "INCONCLUSIVE",
    message: "Rode de novo com ?email=seu@email para fechar o diagnóstico.",
  };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token =
    request.headers.get("x-diagnostic-token") ?? url.searchParams.get("token");

  if (!isAuthorized(token)) {
    try {
      const result = await db.execute(sql`select now() as now`);
      const row = asRows<{ now?: string }>(result)[0];

      return NextResponse.json({
        ok: true,
        database: "connected",
        time: row?.now ?? null,
        hint: "Passe ?token=...&email=... para o diagnóstico completo.",
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
    const serverInfo = asRows<ServerInfoRow>(
      await db.execute(sql`
        select
          current_database() as database,
          current_user as role,
          current_schema() as schema,
          inet_server_addr()::text as server
      `),
    );

    const tables = asRows<TableRow>(
      await db.execute(sql`
        select table_schema, table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name in ('user', 'account', 'session', 'albums', 'events')
        order by table_name
      `),
    );

    const rawUserCount = asRows<CountRow>(
      await db.execute(sql`select count(*)::int as n from "user"`),
    )[0]?.n;

    const rawAccountCount = asRows<CountRow>(
      await db.execute(sql`select count(*)::int as n from "account"`),
    )[0]?.n;

    const rawAlbumCount = asRows<CountRow>(
      await db.execute(sql`select count(*)::int as n from albums`),
    )[0]?.n;

    const rawEventCount = asRows<CountRow>(
      await db.execute(sql`select count(*)::int as n from events`),
    )[0]?.n;

    const [drizzleUserCount] = await db.select({ n: count() }).from(user);
    const [drizzleAlbumCount] = await db.select({ n: count() }).from(albums);
    const [drizzleEventCount] = await db.select({ n: count() }).from(events);

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
      ? await db
          .select({
            id: user.id,
            email: user.email,
            disabled: user.disabled,
            emailLength: sql<number>`length(${user.email})`,
          })
          .from(user)
          .where(eq(user.email, email))
      : [];

    const rawEmailMatch = email
      ? asRows<{ id: string; email: string }>(
          await db.execute(sql`
            select id, email
            from "user"
            where lower(email) = ${email}
            limit 5
          `),
        )
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

    const adapter = await auth.$context;
    let adapterLookup: Awaited<
      ReturnType<typeof adapter.internalAdapter.findUserByEmail>
    > | null = null;
    let adapterError: string | null = null;

    if (email) {
      try {
        adapterLookup = await adapter.internalAdapter.findUserByEmail(email, {
          includeAccounts: true,
        });
      } catch (error) {
        adapterError =
          error instanceof Error ? error.message : "adapter lookup failed";
      }
    }

    const hasCredential = Boolean(
      adapterLookup?.accounts.some(
        (item) => item.providerId === "credential" && Boolean(item.password),
      ) || accounts.some((item) => item.providerId === "credential" && item.hasPassword),
    );

    const counts = {
      raw: {
        users: rawUserCount ?? null,
        accounts: rawAccountCount ?? null,
        albums: rawAlbumCount ?? null,
        events: rawEventCount ?? null,
      },
      drizzle: {
        users: Number(drizzleUserCount?.n ?? 0),
        albums: Number(drizzleAlbumCount?.n ?? 0),
        events: Number(drizzleEventCount?.n ?? 0),
      },
    };

    const verdict = buildVerdict({
      albums: counts.raw.albums ?? counts.drizzle.albums,
      events: counts.raw.events ?? counts.drizzle.events,
      usersRaw: counts.raw.users ?? 0,
      usersDrizzle: counts.drizzle.users,
      email,
      drizzleFound: match.length > 0,
      adapterFound: Boolean(adapterLookup),
      hasCredential,
    });

    return NextResponse.json({
      ok: true,
      runtime: {
        node: process.version,
        nodeEnv: process.env.NODE_ENV ?? null,
        betterAuthUrl: process.env.BETTER_AUTH_URL ?? null,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
        secretFingerprint: process.env.BETTER_AUTH_SECRET
          ? fingerprint(process.env.BETTER_AUTH_SECRET)
          : null,
      },
      connection: describeConnection(),
      server: serverInfo[0] ?? null,
      tables,
      counts,
      users: {
        total: users.length,
        emails: users.map((row) => ({
          email: row.email,
          emailJson: JSON.stringify(row.email),
          disabled: row.disabled,
          createdAt: row.createdAt,
        })),
      },
      lookup: email
        ? {
            email,
            drizzleFound: match.length > 0,
            drizzleRow: match[0] ?? null,
            rawSqlFound: rawEmailMatch.length > 0,
            rawSqlRows: rawEmailMatch,
            adapterFound: Boolean(adapterLookup),
            adapterError,
            adapterAccounts:
              adapterLookup?.accounts.map((item) => ({
                providerId: item.providerId,
                hasPassword: Boolean(item.password),
              })) ?? [],
            accounts,
            hasCredential,
          }
        : null,
      verdict,
      compareLocally: {
        passwordFingerprintExpectedIfSameEnv: "rode local e compare connection.*Fingerprint",
        note: "Se counts.albums > 0 e counts.users = 0 → auth e conteúdo divergem. Se adapterFound=false com drizzleFound=true → bug do adapter neste build (npm/Node 22).",
      },
    });
  } catch (error) {
    const err = error as { name?: string; message?: string; code?: string };

    console.error("AUTH DIAGNOSTIC", err);

    return NextResponse.json(
      {
        ok: false,
        connection: describeConnection(),
        runtime: {
          node: process.version,
          nodeEnv: process.env.NODE_ENV ?? null,
        },
        error: { name: err.name, message: err.message, code: err.code },
      },
      { status: 500 },
    );
  }
}
