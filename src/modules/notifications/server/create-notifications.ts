import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { notificationPreferences, notifications } from "@/db/schema";
import {
  parseCapabilities,
  type SiteCapability,
} from "@/lib/permissions";
import {
  NOTIFICATION_TYPE_CAPABILITY,
  type NotificationType,
} from "@/modules/notifications/notification-types";
import type { NotificationMetadata } from "@/modules/notifications/types";

type CreateNotificationsInput = {
  type: NotificationType;
  recipientUserIds?: string[];
  excludeUserIds?: string[];
  actorUserId?: string | null;
  /** Quando false, o ator também recebe a notificação (útil em pedidos públicos feitos por alguém da equipe). */
  excludeActor?: boolean;
  entityType: string;
  entityId: string;
  href: string | null;
  metadata?: NotificationMetadata;
};

const compactMetadata = (
  metadata: NotificationMetadata | undefined,
): NotificationMetadata => {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, NonNullable<(typeof entry)[1]>] =>
        entry[1] !== undefined && entry[1] !== null,
    ),
  );
};

const hasCapabilityValue = (
  capabilities: unknown,
  capability: SiteCapability,
) => parseCapabilities(capabilities).includes(capability);

const isActiveUser = or(eq(user.disabled, false), isNull(user.disabled));

const toDisabledTypeSet = (value: unknown) =>
  new Set(
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [],
  );

const createNotificationsUnsafe = async (input: CreateNotificationsInput) => {
  const excludeActor = input.excludeActor !== false;
  const excluded = new Set(
    [
      ...(excludeActor ? [input.actorUserId] : []),
      ...(input.excludeUserIds ?? []),
    ].filter((id): id is string => Boolean(id)),
  );

  const uniqueRecipientIds = input.recipientUserIds
    ? [...new Set(input.recipientUserIds)].filter((id) => !excluded.has(id))
    : null;

  if (uniqueRecipientIds && uniqueRecipientIds.length === 0) {
    return;
  }

  const candidates = uniqueRecipientIds
    ? await db
        .select({
          id: user.id,
          capabilities: user.capabilities,
        })
        .from(user)
        .where(and(isActiveUser, inArray(user.id, uniqueRecipientIds)))
    : await db
        .select({
          id: user.id,
          capabilities: user.capabilities,
        })
        .from(user)
        .where(isActiveUser);

  const requiredCapability = NOTIFICATION_TYPE_CAPABILITY[input.type];

  const eligible = candidates.filter((candidate) => {
    if (excluded.has(candidate.id)) {
      return false;
    }

    if (
      requiredCapability &&
      !hasCapabilityValue(candidate.capabilities, requiredCapability)
    ) {
      return false;
    }

    return true;
  });

  if (eligible.length === 0) {
    return;
  }

  const preferenceRows = await db
    .select({
      userId: notificationPreferences.userId,
      disabledTypes: notificationPreferences.disabledTypes,
    })
    .from(notificationPreferences)
    .where(
      inArray(
        notificationPreferences.userId,
        eligible.map((candidate) => candidate.id),
      ),
    );

  const disabledByUser = new Map(
    preferenceRows.map((row) => [row.userId, toDisabledTypeSet(row.disabledTypes)]),
  );

  const recipients = eligible.filter(
    (candidate) => !disabledByUser.get(candidate.id)?.has(input.type),
  );

  if (recipients.length === 0) {
    return;
  }

  await db.insert(notifications).values(
    recipients.map((recipient) => ({
      recipientUserId: recipient.id,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      href: input.href,
      metadata: compactMetadata(input.metadata),
    })),
  );
};

export const createNotifications = async (input: CreateNotificationsInput) => {
  try {
    await createNotificationsUnsafe(input);
  } catch (error) {
    console.error("Falha ao criar notificações", {
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
  }
};
