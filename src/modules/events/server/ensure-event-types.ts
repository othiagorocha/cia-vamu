import { db } from "@/db";
import { eventTypes } from "@/db/schema";
import { DEFAULT_EVENT_TYPES } from "@/modules/events/event-types";

export const ensureDefaultEventTypes = async () => {
  await db
    .insert(eventTypes)
    .values(
      DEFAULT_EVENT_TYPES.map((type) => ({
        slug: type.slug,
        label: type.label,
        emoji: type.emoji,
        defaultColor: type.defaultColor,
        isSystem: type.isSystem,
        sortOrder: type.sortOrder,
      })),
    )
    .onConflictDoNothing({ target: eventTypes.slug });
};
