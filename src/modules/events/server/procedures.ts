import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { events } from "@/db/schema";
import { deleteImageFromStorage, uploadImageToStorage } from "@/lib/storage";
import {
  createEventSchema,
  removeEventSchema,
  updateEventSchema,
} from "@/modules/events/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure, requireCapability } from "@/trpc/init";

export const eventsRouter = createTRPCRouter({
  listUpcoming: baseProcedure.query(async () => {
    const now = new Date();

    return db
      .select()
      .from(events)
      .where(and(eq(events.published, true), gte(events.startsAt, now)))
      .orderBy(asc(events.startsAt));
  }),

  listAll: protectedProcedure.query(async () => {
    return db.select().from(events).orderBy(desc(events.startsAt));
  }),

  getOne: baseProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id));

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado.",
        });
      }

      return event;
    }),

  create: requireCapability("events:write")
    .input(createEventSchema)
    .mutation(async ({ input }) => {
      const { image, ...data } = input;

      const [created] = await db
        .insert(events)
        .values({
          title: data.title,
          description: data.description,
          type: data.type,
          startsAt: data.startsAt,
          endsAt: data.endsAt ?? null,
          location: data.location,
          published: data.published,
        })
        .returning();

      if (!image) {
        return created;
      }

      const uploaded = await uploadImageToStorage({
        dataUrl: image,
        folder: `events/${created.id}`,
      });

      const [event] = await db
        .update(events)
        .set({
          imageUrl: uploaded.imageUrl,
          storagePath: uploaded.storagePath,
          updatedAt: new Date(),
        })
        .where(eq(events.id, created.id))
        .returning();

      return event;
    }),

  update: requireCapability("events:write")
    .input(updateEventSchema)
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado.",
        });
      }

      const { image, ...data } = input.data;
      let imageUrl = existing.imageUrl;
      let storagePath = existing.storagePath;

      if (image) {
        const uploaded = await uploadImageToStorage({
          dataUrl: image,
          folder: `events/${input.id}`,
        });

        if (existing.storagePath && existing.storagePath !== uploaded.storagePath) {
          await deleteImageFromStorage(existing.storagePath).catch(() => undefined);
        }

        imageUrl = uploaded.imageUrl;
        storagePath = uploaded.storagePath;
      }

      const [event] = await db
        .update(events)
        .set({
          title: data.title,
          description: data.description,
          type: data.type,
          startsAt: data.startsAt,
          endsAt: data.endsAt ?? null,
          location: data.location,
          published: data.published,
          imageUrl,
          storagePath,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id))
        .returning();

      return event;
    }),

  remove: requireCapability("events:write")
    .input(removeEventSchema)
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado.",
        });
      }

      if (existing.storagePath) {
        await deleteImageFromStorage(existing.storagePath).catch(() => undefined);
      }

      await db.delete(events).where(eq(events.id, input.id));
      return { success: true };
    }),
});
