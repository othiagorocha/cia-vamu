import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { eventTypes, events } from "@/db/schema";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import { slugifyEventTypeLabel } from "@/modules/events/event-types";
import {
  createEventTypeSchema,
  removeEventTypeSchema,
  updateEventTypeSchema,
} from "@/modules/events/schema";
import { ensureDefaultEventTypes } from "@/modules/events/server/ensure-event-types";
import {
  createTRPCRouter,
  protectedProcedure,
  requireCapability,
} from "@/trpc/init";

const listOrderedTypes = () =>
  db
    .select()
    .from(eventTypes)
    .orderBy(asc(eventTypes.sortOrder), asc(eventTypes.label));

const allocateSlug = async (label: string) => {
  const base = slugifyEventTypeLabel(label);

  for (let index = 0; index < 30; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const [existing] = await db
      .select({ id: eventTypes.id })
      .from(eventTypes)
      .where(eq(eventTypes.slug, slug))
      .limit(1);

    if (!existing) {
      return slug;
    }
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
};

export const eventTypesRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    const existing = await listOrderedTypes();

    if (existing.length > 0) {
      return existing;
    }

    await ensureDefaultEventTypes();
    return listOrderedTypes();
  }),

  create: requireCapability("users:manage")
    .input(createEventTypeSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureDefaultEventTypes();

      const [last] = await db
        .select({ sortOrder: eventTypes.sortOrder })
        .from(eventTypes)
        .orderBy(desc(eventTypes.sortOrder))
        .limit(1);

      const [created] = await db
        .insert(eventTypes)
        .values({
          slug: await allocateSlug(input.label),
          label: input.label,
          defaultColor: input.defaultColor,
          isSystem: false,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        })
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_TYPE_CREATE,
        entityType: "event_type",
        entityId: created.id,
        metadata: {
          label: created.label,
          defaultColor: created.defaultColor,
        },
      });

      return created;
    }),

  update: requireCapability("users:manage")
    .input(updateEventTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(eventTypes)
        .where(eq(eventTypes.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tipo de agenda não encontrado.",
        });
      }

      const [updated] = await db
        .update(eventTypes)
        .set({
          label: input.data.label,
          defaultColor: input.data.defaultColor,
          updatedAt: new Date(),
        })
        .where(eq(eventTypes.id, input.id))
        .returning();

      if (updated) {
        const changes = diffFields(
          {
            label: existing.label,
            defaultColor: existing.defaultColor,
          },
          {
            label: updated.label,
            defaultColor: updated.defaultColor,
          },
        );

        if (changes.length > 0) {
          await writeAuditLog({
            actor: ctx.session.user,
            action: AUDIT_ACTIONS.EVENTS_TYPE_UPDATE,
            entityType: "event_type",
            entityId: updated.id,
            metadata: {
              label: updated.label,
              changes,
            },
          });
        }
      }

      return updated;
    }),

  remove: requireCapability("users:manage")
    .input(removeEventTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(eventTypes)
        .where(eq(eventTypes.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tipo de agenda não encontrado.",
        });
      }

      if (existing.isSystem) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Tipos padrão da agenda não podem ser excluídos.",
        });
      }

      const [inUse] = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.typeId, input.id))
        .limit(1);

      if (inUse) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este tipo ainda tem eventos. Edite o nome ou a cor, sem excluir.",
        });
      }

      await db.delete(eventTypes).where(eq(eventTypes.id, input.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_TYPE_REMOVE,
        entityType: "event_type",
        entityId: existing.id,
        metadata: { label: existing.label },
      });

      return { success: true };
    }),
});
