"use client";

import { useState } from "react";
import { CalendarOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal, revealDelay } from "@/components/reveal";
import { EventCard } from "@/modules/events/ui/components/event-card";
import {
  EventsCalendar,
  EventsCalendarSkeleton,
} from "@/modules/events/ui/components/events-calendar";
import { EventDetailDialog } from "@/modules/events/ui/components/event-detail-dialog";
import { EventsIncludePastToggle } from "@/modules/events/ui/components/events-include-past-toggle";
import { EventsPublicTable } from "@/modules/events/ui/components/events-public-table";
import { EventsViewModeToggle } from "@/modules/events/ui/components/events-view-mode-toggle";
import { useEventsIncludePast } from "@/modules/events/ui/hooks/use-events-include-past";
import { usePublicEventsViewMode } from "@/modules/events/ui/hooks/use-events-view-mode";
import type { EventRecord } from "@/modules/events/types";
import { trpc } from "@/trpc/client";

export const EventsView = () => {
  const t = useTranslations("events");
  const [includePast, setIncludePast] = useEventsIncludePast();
  const [events] = trpc.events.listUpcoming.useSuspenseQuery({
    includePast: includePast ?? false,
  });
  const [viewMode, setViewMode] = usePublicEventsViewMode();
  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <EventsIncludePastToggle
          value={includePast ?? false}
          onChange={(next) => {
            void setIncludePast(next);
          }}
        />
        <EventsViewModeToggle
          value={viewMode}
          onChange={(mode) => {
            void setViewMode(mode);
          }}
        />
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          <CalendarOffIcon className="size-10" />
          <p>{includePast ? t("emptyAll") : t("empty")}</p>
        </div>
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
    </div>
  );
};

export const EventsViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="h-9 w-36 animate-pulse rounded-lg bg-muted/60" />
        <div className="flex gap-1">
          <div className="size-8 animate-pulse rounded bg-muted/60" />
          <div className="size-8 animate-pulse rounded bg-muted/60" />
          <div className="size-8 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
      <EventsCalendarSkeleton />
    </div>
  );
};
