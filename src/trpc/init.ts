import { cache } from "react";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { hasCapability, type SiteCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const createTRPCContext = cache(async () => {
  const session = await getSession();

  return { session };
});

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar autenticado para fazer isso.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const requireCapability = (capability: SiteCapability) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!hasCapability(ctx.session, capability)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Você não tem permissão para fazer isso.",
      });
    }

    return next({ ctx });
  });
