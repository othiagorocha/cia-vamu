"use client";

import { CalendarDaysIcon, ImagesIcon, MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/trpc/client";

type DashboardOverviewViewProps = {
  canEvents: boolean;
  canAlbums: boolean;
  canContact: boolean;
};

export const DashboardOverviewView = ({
  canEvents,
  canAlbums,
  canContact,
}: DashboardOverviewViewProps) => {
  const t = useTranslations("dashboard.overview");
  const eventsQuery = trpc.events.listAll.useQuery(undefined, {
    enabled: canEvents,
  });
  const albumsQuery = trpc.albums.listAll.useQuery(undefined, {
    enabled: canAlbums,
  });
  const messagesQuery = trpc.contact.listAll.useQuery(undefined, {
    enabled: canContact,
  });

  const events = eventsQuery.data ?? [];
  const albums = albumsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  const publishedEvents = events.filter((event) => event.published).length;
  const publishedAlbums = albums.filter((album) => album.published).length;
  const unreadMessages = messages.filter((message) => !message.readAt).length;

  const cards = [
    canEvents
      ? {
          label: t("publishedEvents"),
          value: publishedEvents,
          total: events.length,
          icon: CalendarDaysIcon,
        }
      : null,
    canAlbums
      ? {
          label: t("publishedAlbums"),
          value: publishedAlbums,
          total: albums.length,
          icon: ImagesIcon,
        }
      : null,
    canContact
      ? {
          label: t("unreadMessages"),
          value: unreadMessages,
          total: messages.length,
          icon: MailIcon,
        }
      : null,
  ].filter((card) => card !== null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
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
      )}
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
