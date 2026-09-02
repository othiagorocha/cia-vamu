import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { eventTypes, events } from "@/db/schema";
import { deleteImageFromStorage, uploadImageToStorage } from "@/lib/storage";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import { isEventArchived } from "@/modules/events/event-status";
import {
  changeEventTypeSchema,
  createEventSchema,
  removeEventSchema,
  reorderEventSchema,
  suggestLocationsSchema,
  updateEventSchema,
} from "@/modules/events/schema";
import { fetchPlaceSuggestions } from "@/modules/events/server/places-autocomplete";
import { eventSocialProcedures } from "@/modules/events/server/social-procedures";
import { toEventRecord } from "@/modules/events/server/to-event-record";
import { baseProcedure, createTRPCRouter, protectedProcedure, requireCapability } from "@/trpc/init";

const eventListOrder = [asc(events.sortOrder), asc(events.startsAt)] as const;

const eventWithType = {
  with: { type: true as const },
};

const getEventWithType = async (id: string) => {
  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    ...eventWithType,
  });

  if (!event?.type) {
    return null;
  }

  return toEventRecord(event);
};

const requireEventType = async (typeId: string) => {
  const [eventType] = await db
    .select()
    .from(eventTypes)
    .where(eq(eventTypes.id, typeId))
    .limit(1);

  if (!eventType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tipo de agenda não encontrado.",
    });
  }

  return eventType;
};

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

    const rows = await db.query.events.findMany({
      where: and(
        eq(events.published, true),
        or(
          gte(events.endsAt, now),
          and(isNull(events.endsAt), gte(events.startsAt, now)),
        ),
      ),
      orderBy: [...eventListOrder],
      ...eventWithType,
    });

    return rows.flatMap((event) => (event.type ? [toEventRecord(event)] : []));
  }),

  listAll: protectedProcedure.query(async () => {
    const rows = await db.query.events.findMany({
      orderBy: [...eventListOrder],
      ...eventWithType,
    });

    return rows.flatMap((event) => (event.type ? [toEventRecord(event)] : []));
  }),

  getOne: baseProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const event = await getEventWithType(input.id);

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
      const eventType = await requireEventType(data.typeId);
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
          typeId: data.typeId,
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

      if (image) {
        const uploaded = await uploadImageToStorage({
          dataUrl: image,
          folder: `events/${created.id}`,
        });

        await db
          .update(events)
          .set({
            imageUrl: uploaded.imageUrl,
            storagePath: uploaded.storagePath,
            updatedAt: new Date(),
          })
          .where(eq(events.id, created.id));
      } else if (sourceEventId) {
        const [source] = await db
          .select()
          .from(events)
          .where(eq(events.id, sourceEventId));

        if (source?.imageUrl) {
          await db
            .update(events)
            .set({
              imageUrl: source.imageUrl,
              storagePath: source.storagePath,
              updatedAt: new Date(),
            })
            .where(eq(events.id, created.id));
        }
      }

      const result = await getEventWithType(created.id);

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_CREATE,
        entityType: "event",
        entityId: created.id,
        metadata: {
          title: created.title,
          published: created.published,
          type: eventType.label,
        },
      });

      return result ?? created;
    }),

  update: requireCapability("events:write")
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await getEventWithType(input.id);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado.",
        });
      }

      const eventType = await requireEventType(input.data.typeId);
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
          typeId: data.typeId,
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
            type: existing.type.label,
            location: existing.location,
            locationMapsQuery: existing.locationMapsQuery,
            color: existing.color,
            important: existing.important,
          },
          {
            title: event.title,
            published: event.published,
            type: eventType.label,
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

      return (await getEventWithType(input.id)) ?? event;
    }),

  changeType: requireCapability("events:write")
    .input(changeEventTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await getEventWithType(input.id);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado.",
        });
      }

      if (existing.typeId === input.typeId) {
        return existing;
      }

      const eventType = await requireEventType(input.typeId);

      await db
        .update(events)
        .set({
          typeId: input.typeId,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id));

      const result = await getEventWithType(input.id);

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_UPDATE,
        entityType: "event",
        entityId: input.id,
        metadata: {
          title: existing.title,
          changes: diffFields(
            { type: existing.type.label },
            { type: eventType.label },
          ),
        },
      });

      return result ?? existing;
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

  ...eventSocialProcedures,
});
