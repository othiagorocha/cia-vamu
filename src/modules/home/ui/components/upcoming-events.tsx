"use client";

import Link from "next/link";
import { ArrowRightIcon, CalendarOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal, revealDelay } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/modules/events/ui/components/event-card";
import { trpc } from "@/trpc/client";

export const UpcomingEvents = () => {
  const t = useTranslations("home.events");
  const [events] = trpc.events.listUpcoming.useSuspenseQuery();
  const upcoming = events.slice(0, 3);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <Reveal>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("title")}
            </h2>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/agenda">
              {t("viewAll")}
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </Reveal>

      {upcoming.length === 0 ? (
        <Reveal>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <CalendarOffIcon className="size-10" />
            <p>{t("empty")}</p>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {upcoming.map((event, index) => (
            <Reveal key={event.id} delayMs={revealDelay(index)} className="h-full">
              <EventCard event={event} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
};

export const UpcomingEventsSkeleton = () => {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </section>
  );
};
