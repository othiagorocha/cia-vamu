import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { contactFormSchema } from "@/modules/contact/schema";
import { baseProcedure, createTRPCRouter, requireCapability } from "@/trpc/init";

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

  listAll: requireCapability("users:manage").query(async () => {
    return db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));
  }),

  markAsRead: requireCapability("users:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const [message] = await db
        .update(contactMessages)
        .set({ readAt: new Date() })
        .where(eq(contactMessages.id, input.id))
        .returning();

      return message;
    }),
});
