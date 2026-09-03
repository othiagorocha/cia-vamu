"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationItem } from "@/modules/notifications/ui/components/notification-item";
import type { NotificationRecord } from "@/modules/notifications/types";
import { trpc } from "@/trpc/client";

const POLL_INTERVAL_MS = 30_000;

const resolveNotificationHref = (notification: NotificationRecord) => {
  if (notification.type === "prayer_request" && notification.entityId) {
    if (notification.href?.includes("prayer=")) {
      return notification.href;
    }

    return `/admin/oracao?prayer=${notification.entityId}`;
  }

  return notification.href;
};

export const NotificationsBell = () => {
  const t = useTranslations("notifications");
  const router = useRouter();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
  });
  const listQuery = trpc.notifications.list.useQuery(
    { limit: 20 },
    { refetchInterval: POLL_INTERVAL_MS },
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
  });

  const unreadCount = unreadQuery.data ?? 0;
  const items = listQuery.data ?? [];

  const handleSelect = (notification: NotificationRecord) => {
    if (!notification.readAt) {
      markReadMutation.mutate({ id: notification.id });
    }

    setOpen(false);

    const href = resolveNotificationHref(notification);
    if (href) {
      router.push(href);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-11"
          aria-label={t("bellLabel", { count: unreadCount })}
        >
          <BellIcon className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 animate-bounce items-center justify-center rounded-full bg-orange-400 px-1 text-[10px] font-medium text-black motion-reduce:animate-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-medium text-foreground">
            {t("title")}
          </DropdownMenuLabel>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              {t("markAllRead")}
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-80 overflow-y-auto p-1">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-full justify-center text-xs"
            asChild
          >
            <Link href="/admin/perfil" onClick={() => setOpen(false)}>
              {t("preferencesLink")}
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
