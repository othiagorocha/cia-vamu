import { z } from "zod";

import { NOTIFICATION_TYPES } from "@/modules/notifications/notification-types";

export const listNotificationsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});

export const markNotificationReadSchema = z.object({
  id: z.uuid(),
});

export const updateNotificationPreferencesSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  enabled: z.boolean(),
});
