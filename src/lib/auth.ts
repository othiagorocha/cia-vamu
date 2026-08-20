import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { account, session, user, verification } from "@/db/auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
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
      mustChangePassword: {
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
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "http://localhost:3000",
    "https://www.ciavamu.com.br",
    "https://ciavamu.com.br",
  ],
  advanced: {
    trustedProxyHeaders: true,
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  // nextCookies precisa ser o último plugin: aplica os Set-Cookie da
  // resposta do better-auth direto na resposta do Next quando chamamos
  // auth.api.* de dentro de uma Server Action / Route Handler.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
