import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { prayerRequests } from "@/db/schema";
import { prayerRequestFormSchema } from "@/modules/prayers/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
  requireCapability,
} from "@/trpc/init";

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

      return request;
    }),

  list: protectedProcedure.query(async () => {
    return db
      .select()
      .from(prayerRequests)
      .orderBy(desc(prayerRequests.createdAt));
  }),

  remove: requireCapability("users:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await db
        .delete(prayerRequests)
        .where(eq(prayerRequests.id, input.id));
      return { success: true };
    }),
});
