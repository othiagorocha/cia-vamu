"use client";

import { useTranslations } from "next-intl";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EventCard } from "@/modules/events/ui/components/event-card";
import type { EventRecord } from "@/modules/events/types";

type UpcomingEventsSliderProps = {
  events: EventRecord[];
};

export const UpcomingEventsSlider = ({ events }: UpcomingEventsSliderProps) => {
  const t = useTranslations("home.events");
  const showControls = events.length > 1;

  return (
    <Carousel
      opts={{ align: "start", containScroll: "trimSnaps" }}
      className="flex w-full items-center gap-2 sm:gap-3"
    >
      {showControls ? (
        <CarouselPrevious
          size="icon"
          aria-label={t("previous")}
          className="static inset-auto size-8 shrink-0"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <CarouselContent>
          {events.map((event) => (
            <CarouselItem
              key={event.id}
              className="basis-[85%] sm:basis-1/2 lg:basis-1/3"
            >
              <EventCard event={event} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </div>

      {showControls ? (
        <CarouselNext
          size="icon"
          aria-label={t("next")}
          className="static inset-auto size-8 shrink-0"
        />
      ) : null}
    </Carousel>
  );
};
