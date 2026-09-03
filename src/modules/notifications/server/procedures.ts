import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { notificationPreferences, notifications } from "@/db/schema";
import { getCapabilities } from "@/lib/permissions";
import {
  NOTIFICATION_TYPE_CAPABILITY,
  NOTIFICATION_TYPE_GROUPS,
  NOTIFICATION_TYPES,
  isNotificationType,
  type NotificationPreferenceGroup,
  type NotificationType,
} from "@/modules/notifications/notification-types";
import {
  listNotificationsSchema,
  markNotificationReadSchema,
  updateNotificationPreferencesSchema,
} from "@/modules/notifications/schema";
import type {
  NotificationPreferenceItem,
  NotificationRecord,
} from "@/modules/notifications/types";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const PREFERENCE_GROUP_BY_TYPE = Object.fromEntries(
  Object.entries(NOTIFICATION_TYPE_GROUPS).flatMap(([group, types]) =>
    types.map((type) => [type, group]),
  ),
) as Record<NotificationType, NotificationPreferenceGroup>;

const toNotificationRecord = (row: {
  id: string;
  type: string;
  entityId: string;
  href: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
  readAt: Date | null;
  createdAt: Date;
  actorUserId: string | null;
  actorName: string | null;
}): NotificationRecord | null => {
  if (!isNotificationType(row.type)) {
    return null;
  }

  return {
    id: row.id,
    type: row.type,
    entityId: row.entityId,
    href: row.href,
    metadata: row.metadata ?? {},
    readAt: row.readAt,
    createdAt: row.createdAt,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
  };
};

const visibleTypesForSession = (capabilities: ReturnType<typeof getCapabilities>) =>
  NOTIFICATION_TYPES.filter((type) => {
    const required = NOTIFICATION_TYPE_CAPABILITY[type];
    return !required || capabilities.includes(required);
  });

export const notificationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          entityId: notifications.entityId,
          href: notifications.href,
          metadata: notifications.metadata,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
          actorUserId: notifications.actorUserId,
          actorName: user.name,
        })
        .from(notifications)
        .leftJoin(user, eq(user.id, notifications.actorUserId))
        .where(eq(notifications.recipientUserId, ctx.session.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit);

      return rows.flatMap((row) => {
        const record = toNotificationRecord(row);
        return record ? [record] : [];
      });
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, ctx.session.user.id),
          isNull(notifications.readAt),
        ),
      );

    return row?.count ?? 0;
  }),

  markRead: protectedProcedure
    .input(markNotificationReadSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.recipientUserId, ctx.session.user.id),
            isNull(notifications.readAt),
          ),
        );

      return { success: true as const };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientUserId, ctx.session.user.id),
          isNull(notifications.readAt),
        ),
      );

    return { success: true as const };
  }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const capabilities = getCapabilities(ctx.session);
    const visibleTypes = visibleTypesForSession(capabilities);
    const [row] = await db
      .select({
        disabledTypes: notificationPreferences.disabledTypes,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.session.user.id));

    const disabled = new Set(row?.disabledTypes ?? []);

    const items: NotificationPreferenceItem[] = visibleTypes.map((type) => ({
      type,
      enabled: !disabled.has(type),
      group: PREFERENCE_GROUP_BY_TYPE[type],
    }));

    return { items };
  }),

  updatePreferences: protectedProcedure
    .input(updateNotificationPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const capabilities = getCapabilities(ctx.session);
      const visibleTypes = visibleTypesForSession(capabilities);

      if (!visibleTypes.includes(input.type)) {
        return { success: true as const };
      }

      const userId = ctx.session.user.id;
      const [existing] = await db
        .select({
          disabledTypes: notificationPreferences.disabledTypes,
        })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));

      const nextDisabled = new Set(existing?.disabledTypes ?? []);

      if (input.enabled) {
        nextDisabled.delete(input.type);
      } else {
        nextDisabled.add(input.type);
      }

      const disabledTypes = [...nextDisabled];
      const now = new Date();

      if (existing) {
        await db
          .update(notificationPreferences)
          .set({
            disabledTypes,
            updatedAt: now,
          })
          .where(eq(notificationPreferences.userId, userId));
      } else {
        await db.insert(notificationPreferences).values({
          userId,
          disabledTypes,
          updatedAt: now,
        });
      }

      return { success: true as const };
    }),
});
