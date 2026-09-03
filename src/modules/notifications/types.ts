import type { NotificationType } from "@/modules/notifications/notification-types";

export type NotificationMetadataValue = string | number | boolean | null;

export type NotificationMetadata = Record<string, NotificationMetadataValue>;

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  entityId: string;
  href: string | null;
  metadata: NotificationMetadata;
  readAt: Date | null;
  createdAt: Date;
  actorUserId: string | null;
  actorName: string | null;
};

export type NotificationPreferenceItem = {
  type: NotificationType;
  enabled: boolean;
  group: "personal" | "team" | "public";
};
