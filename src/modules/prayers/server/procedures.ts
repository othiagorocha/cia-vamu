import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { prayerReactions, prayerRequests } from "@/db/schema";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import { prayerRequestFormSchema } from "@/modules/prayers/schema";
import type { PrayerReactor, PrayerRequestRecord } from "@/modules/prayers/types";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
  requireCapability,
} from "@/trpc/init";

const withReactions = async (
  rows: (typeof prayerRequests.$inferSelect)[],
  userId: string,
): Promise<PrayerRequestRecord[]> => {
  if (rows.length === 0) {
    return [];
  }

  const reactions = await db
    .select({
      requestId: prayerReactions.requestId,
      userId: prayerReactions.userId,
      name: user.name,
    })
    .from(prayerReactions)
    .innerJoin(user, eq(user.id, prayerReactions.userId))
    .orderBy(desc(prayerReactions.createdAt));

  const reactorsByRequest = new Map<string, PrayerReactor[]>();
  const reactedIds = new Set<string>();

  for (const reaction of reactions) {
    const reactors = reactorsByRequest.get(reaction.requestId) ?? [];
    reactors.push({ userId: reaction.userId, name: reaction.name });
    reactorsByRequest.set(reaction.requestId, reactors);

    if (reaction.userId === userId) {
      reactedIds.add(reaction.requestId);
    }
  }

  return rows.map((row) => {
    const reactors = reactorsByRequest.get(row.id) ?? [];

    return {
      ...row,
      reactors,
      reactionCount: reactors.length,
      reacted: reactedIds.has(row.id),
    };
  });
};

export const prayersRouter = createTRPCRouter({
  create: baseProcedure
    .input(prayerRequestFormSchema)
    .mutation(async ({ ctx, input }) => {
      const isAnonymous = input.isAnonymous;
      const [request] = await db
        .insert(prayerRequests)
        .values({
          body: input.body,
          isAnonymous,
          name: isAnonymous ? null : input.name,
          email: isAnonymous || input.email.length === 0 ? null : input.email,
          authorUserId:
            !isAnonymous && ctx.session?.user.id
              ? ctx.session.user.id
              : null,
        })
        .returning();

      if (ctx.session && request) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.PRAYERS_CREATE,
          entityType: "prayer_request",
          entityId: request.id,
          metadata: isAnonymous
            ? { anonymous: true }
            : { name: input.name },
        });
      }

      return request;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(prayerRequests)
      .orderBy(desc(prayerRequests.createdAt));

    return withReactions(rows, ctx.session.user.id);
  }),

  toggleReaction: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [request] = await db
        .select({ id: prayerRequests.id })
        .from(prayerRequests)
        .where(eq(prayerRequests.id, input.id));

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pedido de oração não encontrado.",
        });
      }

      const [existing] = await db
        .select({ id: prayerReactions.id })
        .from(prayerReactions)
        .where(
          and(
            eq(prayerReactions.requestId, input.id),
            eq(prayerReactions.userId, userId),
          ),
        );

      if (existing) {
        await db
          .delete(prayerReactions)
          .where(eq(prayerReactions.id, existing.id));
        return { reacted: false };
      }

      await db.insert(prayerReactions).values({
        requestId: input.id,
        userId,
      });

      return { reacted: true };
    }),

  remove: requireCapability("users:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({
          id: prayerRequests.id,
          isAnonymous: prayerRequests.isAnonymous,
          name: prayerRequests.name,
        })
        .from(prayerRequests)
        .where(eq(prayerRequests.id, input.id));

      await db
        .delete(prayerRequests)
        .where(eq(prayerRequests.id, input.id));

      if (existing) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.PRAYERS_REMOVE,
          entityType: "prayer_request",
          entityId: existing.id,
          metadata: existing.isAnonymous
            ? { anonymous: true }
            : { name: existing.name },
        });
      }

      return { success: true };
    }),
});
