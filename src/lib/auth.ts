import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { account, session, user, verification } from "@/db/auth-schema";

const normalizeAuthEmail = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
    // Temporário: correlacionar User not found com a query real na Hostinger.
    debugLogs: process.env.AUTH_DEBUG_LOGS === "1",
  }),
  user: {
    additionalFields: {
      capabilities: {
        type: "string[]",
        required: true,
        defaultValue: [],
        input: false,
      },
      disabled: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const [account] = await db
            .select({ disabled: user.disabled })
            .from(user)
            .where(eq(user.id, session.userId));

          if (account?.disabled) {
            throw new APIError("FORBIDDEN", {
              message: "Esta conta foi desativada.",
            });
          }

          return { data: session };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") {
        return;
      }

      const rawEmail = ctx.body?.email;
      const email = normalizeAuthEmail(rawEmail);

      console.info("[auth:sign-in] email probe", {
        typeofRaw: typeof rawEmail,
        rawJson: JSON.stringify(rawEmail),
        normalized: email,
        codePoints:
          typeof rawEmail === "string"
            ? [...rawEmail].map((char) => char.codePointAt(0))
            : null,
        hasPassword: typeof ctx.body?.password === "string",
        passwordLength:
          typeof ctx.body?.password === "string" ? ctx.body.password.length : null,
        origin: ctx.headers?.get("origin") ?? null,
        host: ctx.headers?.get("host") ?? null,
        xff: ctx.headers?.get("x-forwarded-for") ?? null,
        xRealIp: ctx.headers?.get("x-real-ip") ?? null,
      });

      if (typeof email === "string" && email !== rawEmail) {
        return {
          context: {
            ...ctx,
            body: {
              ...ctx.body,
              email,
            },
          },
        };
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "http://localhost:3000",
    "https://www.ciavamu.com.br",
    "https://ciavamu.com.br",
  ],
  advanced: {
    // Hostinger (hcdn) encaminha o IP do cliente nestes headers.
    trustedProxyHeaders: true,
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
});

export type Session = typeof auth.$Infer.Session;
