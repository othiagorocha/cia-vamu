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
      className="w-full"
    >
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

      {showControls ? (
        <>
          <CarouselPrevious
            size="icon"
            aria-label={t("previous")}
            className="left-2 border-border bg-background/90 shadow-sm"
          />
          <CarouselNext
            size="icon"
            aria-label={t("next")}
            className="right-2 border-border bg-background/90 shadow-sm"
          />
        </>
      ) : null}
    </Carousel>
  );
};
