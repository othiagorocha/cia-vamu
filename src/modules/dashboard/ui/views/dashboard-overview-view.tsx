"use client";

import { CalendarDaysIcon, ImagesIcon, MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/trpc/client";

export const DashboardOverviewView = () => {
  const t = useTranslations("dashboard.overview");
  const [events] = trpc.events.listAll.useSuspenseQuery();
  const [albums] = trpc.albums.listAll.useSuspenseQuery();
  const [messages] = trpc.contact.listAll.useSuspenseQuery();

  const publishedEvents = events.filter((event) => event.published).length;
  const publishedAlbums = albums.filter((album) => album.published).length;
  const unreadMessages = messages.filter((message) => !message.readAt).length;

  const cards = [
    {
      label: t("publishedEvents"),
      value: publishedEvents,
      total: events.length,
      icon: CalendarDaysIcon,
    },
    {
      label: t("publishedAlbums"),
      value: publishedAlbums,
      total: albums.length,
      icon: ImagesIcon,
    },
    {
      label: t("unreadMessages"),
      value: unreadMessages,
      total: messages.length,
      icon: MailIcon,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="size-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {card.value}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / {card.total} {t("ofTotal")}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const DashboardOverviewViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    </div>
  );
};
