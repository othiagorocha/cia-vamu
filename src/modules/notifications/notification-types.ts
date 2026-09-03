import type { SiteCapability } from "@/lib/permissions";

export const NOTIFICATION_TYPES = [
  "mention",
  "contact_message",
  "prayer_request",
  "event_created",
  "document_uploaded",
  "photo_comment",
  "staff_joined",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const isNotificationType = (value: string): value is NotificationType =>
  NOTIFICATION_TYPES.includes(value as NotificationType);

export const NOTIFICATION_TYPE_CAPABILITY: Partial<
  Record<NotificationType, SiteCapability>
> = {
  contact_message: "contact:manage",
  staff_joined: "users:manage",
};

export const NOTIFICATION_TYPE_GROUPS = {
  personal: ["mention"],
  team: ["event_created", "document_uploaded", "photo_comment", "staff_joined"],
  public: ["contact_message", "prayer_request"],
} as const satisfies Record<string, readonly NotificationType[]>;

export type NotificationPreferenceGroup = keyof typeof NOTIFICATION_TYPE_GROUPS;
