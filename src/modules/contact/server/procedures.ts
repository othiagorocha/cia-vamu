import { desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import { contactFormSchema } from "@/modules/contact/schema";
import {
  baseProcedure,
  createTRPCRouter,
  requireCapability,
} from "@/trpc/init";

export const contactRouter = createTRPCRouter({
  create: baseProcedure
    .input(contactFormSchema)
    .mutation(async ({ input }) => {
      const [message] = await db
        .insert(contactMessages)
        .values(input)
        .returning();

      return message;
    }),

  unreadCount: requireCapability("contact:manage").query(async () => {
    const [row] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(contactMessages)
      .where(isNull(contactMessages.readAt));

    return row?.count ?? 0;
  }),

  listAll: requireCapability("contact:manage").query(async () => {
    return db
      .select()
      .from(contactMessages)
      .orderBy(
        sql`${contactMessages.readAt} is null desc`,
        desc(contactMessages.createdAt),
      );
  }),

  markAsRead: requireCapability("contact:manage")
    .input(z.object({ id: z.uuid(), read: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({
          id: contactMessages.id,
          name: contactMessages.name,
          readAt: contactMessages.readAt,
        })
        .from(contactMessages)
        .where(eq(contactMessages.id, input.id));

      const [message] = await db
        .update(contactMessages)
        .set({ readAt: input.read ? new Date() : null })
        .where(eq(contactMessages.id, input.id))
        .returning();

      if (message) {
        const wasRead = Boolean(existing?.readAt);
        const changes = diffFields(
          { read: wasRead },
          { read: input.read },
        );

        if (changes.length > 0) {
          await writeAuditLog({
            actor: ctx.session.user,
            action: AUDIT_ACTIONS.CONTACT_MARK_READ,
            entityType: "contact_message",
            entityId: message.id,
            metadata: {
              name: message.name,
              changes,
            },
          });
        }
      }

      return message;
    }),

  remove: requireCapability("contact:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({
          id: contactMessages.id,
          name: contactMessages.name,
        })
        .from(contactMessages)
        .where(eq(contactMessages.id, input.id));

      await db.delete(contactMessages).where(eq(contactMessages.id, input.id));

      if (existing) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.CONTACT_REMOVE,
          entityType: "contact_message",
          entityId: existing.id,
          metadata: { name: existing.name },
        });
      }

      return { success: true };
    }),
});
