import { desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
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
    .mutation(async ({ input }) => {
      const [message] = await db
        .update(contactMessages)
        .set({ readAt: input.read ? new Date() : null })
        .where(eq(contactMessages.id, input.id))
        .returning();

      return message;
    }),

  remove: requireCapability("contact:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(contactMessages).where(eq(contactMessages.id, input.id));
      return { success: true };
    }),
});
