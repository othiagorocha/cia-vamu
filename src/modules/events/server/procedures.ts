import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { events } from "@/db/schema";
import { deleteImageFromStorage, uploadImageToStorage } from "@/lib/storage";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import { isEventArchived } from "@/modules/events/event-status";
import {
  createEventSchema,
  removeEventSchema,
  reorderEventSchema,
  suggestLocationsSchema,
  updateEventSchema,
} from "@/modules/events/schema";
import { fetchPlaceSuggestions } from "@/modules/events/server/places-autocomplete";
import { baseProcedure, createTRPCRouter, protectedProcedure, requireCapability } from "@/trpc/init";

const eventListOrder = [asc(events.sortOrder), asc(events.startsAt)] as const;

const persistEventOrder = async (orderedIds: string[]) => {
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(events)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(eq(events.id, id));
    }
  });
};

const persistActiveOrder = async (orderedActiveIds: string[]) => {
  const all = await db.select().from(events).orderBy(...eventListOrder);
  const archivedIds = all
    .filter((event) => isEventArchived(event))
    .map((event) => event.id);
  const activeIds = all
    .filter((event) => !isEventArchived(event))
    .map((event) => event.id);

  const activeSet = new Set(activeIds);

  if (
    orderedActiveIds.length !== activeIds.length ||
    orderedActiveIds.some((id) => !activeSet.has(id))
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A ordem enviada não corresponde aos eventos ativos.",
    });
  }

  await persistEventOrder([...orderedActiveIds, ...archivedIds]);
};

export const eventsRouter = createTRPCRouter({
  listUpcoming: baseProcedure.query(async () => {
    const now = new Date();

    return db
      .select()
      .from(events)
      .where(
        and(
          eq(events.published, true),
          or(
            gte(events.endsAt, now),
            and(isNull(events.endsAt), gte(events.startsAt, now)),
          ),
        ),
      )
      .orderBy(...eventListOrder);
  }),

  listAll: protectedProcedure.query(async () => {
    return db.select().from(events).orderBy(...eventListOrder);
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
    .mutation(async ({ ctx, input }) => {
      const { image, sourceEventId, ...data } = input;
      const [last] = await db
        .select({ sortOrder: events.sortOrder })
        .from(events)
        .orderBy(desc(events.sortOrder))
        .limit(1);

      const [created] = await db
        .insert(events)
        .values({
          title: data.title,
          description: data.description,
          type: data.type,
          startsAt: data.startsAt,
          endsAt: data.endsAt ?? null,
          location: data.location ?? null,
          locationMapsQuery: data.locationMapsQuery ?? null,
          published: data.published,
          color: data.color,
          important: data.important,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        })
        .returning();

      let result = created;

      if (image) {
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

        result = event ?? created;
      } else if (sourceEventId) {
        const [source] = await db
          .select()
          .from(events)
          .where(eq(events.id, sourceEventId));

        if (source?.imageUrl) {
          const [event] = await db
            .update(events)
            .set({
              imageUrl: source.imageUrl,
              storagePath: source.storagePath,
              updatedAt: new Date(),
            })
            .where(eq(events.id, created.id))
            .returning();

          result = event ?? created;
        }
      }

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_CREATE,
        entityType: "event",
        entityId: result.id,
        metadata: {
          title: result.title,
          published: result.published,
          type: result.type,
        },
      });

      return result;
    }),

  update: requireCapability("events:write")
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
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

      const { image, removeImage, ...data } = input.data;
      let imageUrl = existing.imageUrl;
      let storagePath = existing.storagePath;

      if (image) {
        const uploaded = await uploadImageToStorage({
          dataUrl: image,
          folder: `events/${input.id}`,
        });

        if (existing.storagePath && existing.storagePath !== uploaded.storagePath) {
          const [shared] = await db
            .select({ id: events.id })
            .from(events)
            .where(
              and(
                eq(events.storagePath, existing.storagePath),
                ne(events.id, existing.id),
              ),
            )
            .limit(1);

          if (!shared) {
            await deleteImageFromStorage(existing.storagePath).catch(
              () => undefined,
            );
          }
        }

        imageUrl = uploaded.imageUrl;
        storagePath = uploaded.storagePath;
      } else if (removeImage) {
        if (existing.storagePath) {
          const [shared] = await db
            .select({ id: events.id })
            .from(events)
            .where(
              and(
                eq(events.storagePath, existing.storagePath),
                ne(events.id, existing.id),
              ),
            )
            .limit(1);

          if (!shared) {
            await deleteImageFromStorage(existing.storagePath).catch(
              () => undefined,
            );
          }
        }

        imageUrl = null;
        storagePath = null;
      }

      const [event] = await db
        .update(events)
        .set({
          title: data.title,
          description: data.description,
          type: data.type,
          startsAt: data.startsAt,
          endsAt: data.endsAt ?? null,
          location: data.location ?? null,
          locationMapsQuery: data.locationMapsQuery ?? null,
          published: data.published,
          color: data.color,
          important: data.important,
          imageUrl,
          storagePath,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id))
        .returning();

      if (event) {
        const changes = diffFields(
          {
            title: existing.title,
            published: existing.published,
            type: existing.type,
            location: existing.location,
            locationMapsQuery: existing.locationMapsQuery,
            color: existing.color,
            important: existing.important,
          },
          {
            title: event.title,
            published: event.published,
            type: event.type,
            location: event.location,
            locationMapsQuery: event.locationMapsQuery,
            color: event.color,
            important: event.important,
          },
        );

        if (changes.length > 0) {
          await writeAuditLog({
            actor: ctx.session.user,
            action: AUDIT_ACTIONS.EVENTS_UPDATE,
            entityType: "event",
            entityId: event.id,
            metadata: {
              title: event.title,
              changes,
            },
          });
        }
      }

      return event;
    }),

  remove: requireCapability("events:write")
    .input(removeEventSchema)
    .mutation(async ({ ctx, input }) => {
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
        const [shared] = await db
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.storagePath, existing.storagePath),
              ne(events.id, existing.id),
            ),
          )
          .limit(1);

        if (!shared) {
          await deleteImageFromStorage(existing.storagePath).catch(
            () => undefined,
          );
        }
      }

      await db.delete(events).where(eq(events.id, input.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_REMOVE,
        entityType: "event",
        entityId: existing.id,
        metadata: { title: existing.title },
      });

      return { success: true };
    }),

  reorder: requireCapability("events:write")
    .input(reorderEventSchema)
    .mutation(async ({ ctx, input }) => {
      await persistActiveOrder(input.orderedIds);

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_REORDER,
        entityType: "event",
        entityId: input.orderedIds[0],
        metadata: {
          count: input.orderedIds.length,
        },
      });

      return { success: true };
    }),

  suggestLocations: requireCapability("events:write")
    .input(suggestLocationsSchema)
    .query(async ({ input }) => fetchPlaceSuggestions(input.query)),
});
