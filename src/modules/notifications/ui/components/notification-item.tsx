"use client";

import type { ComponentType } from "react";
import {
  AtSignIcon,
  CalendarPlusIcon,
  FileUpIcon,
  ImageIcon,
  MailIcon,
  UserPlusIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PiHandsPrayingBold } from "react-icons/pi";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import type { NotificationType } from "@/modules/notifications/notification-types";
import type { NotificationRecord } from "@/modules/notifications/types";

const TYPE_ICONS: Record<
  NotificationType,
  ComponentType<{ className?: string }>
> = {
  mention: AtSignIcon,
  contact_message: MailIcon,
  prayer_request: PiHandsPrayingBold,
  event_created: CalendarPlusIcon,
  document_uploaded: FileUpIcon,
  photo_comment: ImageIcon,
  staff_joined: UserPlusIcon,
};

const metadataText = (
  metadata: NotificationRecord["metadata"],
  key: string,
) => {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
};

type NotificationItemProps = {
  notification: NotificationRecord;
  onSelect: (notification: NotificationRecord) => void;
};

export const NotificationItem = ({
  notification,
  onSelect,
}: NotificationItemProps) => {
  const t = useTranslations("notifications");
  const Icon = TYPE_ICONS[notification.type];
  const unread = !notification.readAt;
  const actor =
    notification.actorName ?? metadataText(notification.metadata, "actorName");

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        "flex min-h-11 w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
        "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70",
        unread && "bg-orange-400/5",
      )}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-snug">
          {t(`items.${notification.type}`, {
            actor,
            eventTitle: metadataText(notification.metadata, "eventTitle"),
            name: metadataText(notification.metadata, "name") || actor,
            documentName: metadataText(notification.metadata, "documentName"),
          })}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {formatDistanceToNow(notification.createdAt, {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </span>
      {unread ? (
        <span
          aria-hidden
          className="mt-2 size-2 shrink-0 rounded-full bg-orange-400"
        />
      ) : null}
    </button>
  );
};
