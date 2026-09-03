"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CalendarOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal, revealDelay } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import type { EventRecord } from "@/modules/events/types";
import { EventCard } from "@/modules/events/ui/components/event-card";
import {
  EventsCalendar,
  EventsCalendarSkeleton,
} from "@/modules/events/ui/components/events-calendar";
import { EventDetailDialog } from "@/modules/events/ui/components/event-detail-dialog";
import { EventsPublicTable } from "@/modules/events/ui/components/events-public-table";
import { EventsViewModeToggle } from "@/modules/events/ui/components/events-view-mode-toggle";
import { usePublicEventsViewMode } from "@/modules/events/ui/hooks/use-events-view-mode";
import { trpc } from "@/trpc/client";

export const UpcomingEvents = () => {
  const t = useTranslations("home.events");
  const [events] = trpc.events.listUpcoming.useSuspenseQuery({
    includePast: false,
  });
  const [viewMode, setViewMode] = usePublicEventsViewMode();
  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-20">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-medium tracking-[0.2em] text-orange-400 uppercase">
              {t("eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("title")}
            </h2>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
            {events.length > 0 ? (
              <EventsViewModeToggle
                value={viewMode}
                onChange={(mode) => {
                  void setViewMode(mode);
                }}
              />
            ) : null}
            <Button
              asChild
              size="lg"
              className="rounded-full bg-orange-400 text-black hover:bg-orange-300"
            >
              <Link href="/agenda">
                {t("viewAll")}
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>

      {events.length === 0 ? (
        <Reveal>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <CalendarOffIcon className="size-10" />
            <p>{t("empty")}</p>
          </div>
        </Reveal>
      ) : viewMode === "calendar" ? (
        <EventsCalendar
          events={events}
          onEventClick={(event) => setDetailEvent(event)}
        />
      ) : viewMode === "table" ? (
        <EventsPublicTable
          events={events}
          onEventClick={(event) => setDetailEvent(event)}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {events.map((event, index) => (
            <Reveal key={event.id} delayMs={revealDelay(index)} className="h-full">
              <EventCard event={event} />
            </Reveal>
          ))}
        </div>
      )}

      {detailEvent ? (
        <EventDetailDialog
          event={detailEvent}
          open
          onOpenChange={(open) => !open && setDetailEvent(null)}
        />
      ) : null}
    </section>
  );
};

export const UpcomingEventsSkeleton = () => {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-20">
      <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      <EventsCalendarSkeleton />
    </section>
  );
};
