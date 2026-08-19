"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ImagesIcon,
  MailIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventCard } from "@/modules/events/ui/components/event-card";
import { trpc } from "@/trpc/client";

type DashboardOverviewViewProps = {
  canEvents: boolean;
  canAlbums: boolean;
  canContact: boolean;
};

type OverviewCard = {
  href: string;
  label: string;
  value: number;
  total: number;
  icon: LucideIcon;
  extra?: string;
};

const UPCOMING_LIMIT = 8;

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
  const now = Date.now();

  const publishedEvents = events.filter((event) => event.published).length;
  const teamEvents = events.filter((event) => !event.published).length;
  const publishedAlbums = albums.filter((album) => album.published).length;
  const unreadMessages = messages.filter((message) => !message.readAt).length;
  const upcomingEvents = events
    .filter((event) => new Date(event.startsAt).getTime() >= now)
    .slice(0, UPCOMING_LIMIT);

  const cards: OverviewCard[] = [
    ...(canEvents
      ? [
          {
            href: "/admin/agenda",
            label: t("publishedEvents"),
            value: publishedEvents,
            total: events.length,
            extra: t("teamEventsCount", { count: teamEvents }),
            icon: CalendarDaysIcon,
          },
        ]
      : []),
    ...(canAlbums
      ? [
          {
            href: "/admin/albums",
            label: t("publishedAlbums"),
            value: publishedAlbums,
            total: albums.length,
            icon: ImagesIcon,
          },
        ]
      : []),
    ...(canContact
      ? [
          {
            href: "/admin/mensagens",
            label: t("unreadMessages"),
            value: unreadMessages,
            total: messages.length,
            icon: MailIcon,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
              <Card className="h-full transition-colors hover:bg-muted/40">
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
                  {card.extra ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card.extra}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {canEvents ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("upcoming")}
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/agenda">
                {t("viewAgenda")}
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              {t("upcomingEmpty")}
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} showVisibility />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};

export const DashboardOverviewViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
