"use client";

import { CalendarOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EventCard } from "@/modules/events/ui/components/event-card";
import { trpc } from "@/trpc/client";

export const EventsView = () => {
  const t = useTranslations("events");
  const [events] = trpc.events.listUpcoming.useSuspenseQuery();

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
        <CalendarOffIcon className="size-10" />
        <p>{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
};

export const EventsViewSkeleton = () => {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-lg border bg-muted/40"
        />
      ))}
    </div>
  );
};
