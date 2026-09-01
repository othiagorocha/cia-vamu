"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  FilesIcon,
  ImagesIcon,
  MailIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PiHandsPrayingBold } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { EventCard } from "@/modules/events/ui/components/event-card";
import { isEventArchived } from "@/modules/events/event-status";
import { trpc } from "@/trpc/client";

type DashboardOverviewViewProps = {
  canEvents: boolean;
  canAlbums: boolean;
  canContact: boolean;
  canStaff: boolean;
};

type OverviewKpi = {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon | typeof PiHandsPrayingBold;
};

const UPCOMING_LIMIT = 8;
const MAX_KPIS = 6;

const OverviewKpiCard = ({ kpi }: { kpi: OverviewKpi }) => {
  return (
    <Link
      href={kpi.href}
      className="block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <div className="flex h-full items-center justify-between gap-3 rounded-lg bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40">
        <div className="min-w-0">
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {kpi.label}
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none">{kpi.value}</p>
        </div>
        <kpi.icon className="size-4 shrink-0 text-orange-400" />
      </div>
    </Link>
  );
};

export const DashboardOverviewView = ({
  canEvents,
  canAlbums,
  canContact,
  canStaff,
}: DashboardOverviewViewProps) => {
  const t = useTranslations("dashboard.overview");
  const eventsQuery = trpc.events.listAll.useQuery(undefined, {
    enabled: canEvents,
  });
  const albumsQuery = trpc.albums.listAll.useQuery(undefined, {
    enabled: canAlbums,
  });
  const prayersQuery = trpc.prayers.list.useQuery();
  const documentsQuery = trpc.documents.listFolderTree.useQuery();
  const messagesQuery = trpc.contact.listAll.useQuery(undefined, {
    enabled: canContact,
  });
  const staffQuery = trpc.staff.list.useQuery(undefined, {
    enabled: canStaff,
  });

  const events = eventsQuery.data ?? [];
  const albums = albumsQuery.data ?? [];
  const prayers = prayersQuery.data ?? [];
  const documentFolders = documentsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const staff = staffQuery.data ?? [];

  const publishedEvents = events.filter((event) => event.published).length;
  const teamEvents = events.filter((event) => !event.published).length;
  const publishedAlbums = albums.filter((album) => album.published).length;
  const unreadMessages = messages.filter((message) => !message.readAt).length;
  const upcomingEvents = events
    .filter((event) => !isEventArchived(event))
    .slice(0, UPCOMING_LIMIT);

  const kpis: OverviewKpi[] = [
    ...(canEvents
      ? [
          {
            href: "/admin/agenda",
            label: t("publishedEvents"),
            value: publishedEvents,
            icon: CalendarDaysIcon,
          },
          {
            href: "/admin/agenda",
            label: t("teamEvents"),
            value: teamEvents,
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
            icon: ImagesIcon,
          },
        ]
      : []),
    {
      href: "/admin/oracao",
      label: t("prayers"),
      value: prayers.length,
      icon: PiHandsPrayingBold,
    },
    ...(canContact
      ? [
          {
            href: "/admin/mensagens",
            label: t("unreadMessages"),
            value: unreadMessages,
            icon: MailIcon,
          },
        ]
      : [
          {
            href: "/admin/documentos",
            label: t("documents"),
            value: documentFolders.length,
            icon: FilesIcon,
          },
        ]),
    ...(canStaff
      ? [
          {
            href: "/admin/equipe",
            label: t("users"),
            value: staff.length,
            icon: UsersIcon,
          },
        ]
      : []),
  ].slice(0, MAX_KPIS);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {kpis.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div
          role="list"
          aria-label={t("kpis")}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] touch-pan-x sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 sm:snap-none xl:grid-cols-6 [&::-webkit-scrollbar]:hidden"
        >
          {kpis.map((kpi) => (
            <div
              key={`${kpi.href}-${kpi.label}`}
              role="listitem"
              className="w-[min(16.5rem,72vw)] shrink-0 snap-start sm:w-auto sm:min-w-0"
            >
              <OverviewKpiCard kpi={kpi} />
            </div>
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
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-[4.25rem] w-[min(16.5rem,72vw)] shrink-0 animate-pulse rounded-lg bg-muted/40 sm:w-auto sm:min-w-0"
          />
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
