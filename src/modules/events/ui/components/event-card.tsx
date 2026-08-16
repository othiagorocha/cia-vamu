import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MapPinIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import type { EventRecord } from "@/modules/events/types";

export const EventCard = ({ event }: { event: EventRecord }) => {
  const dateLabel = format(
    new Date(event.startsAt),
    "dd 'de' MMMM 'de' yyyy, HH:mm",
    { locale: ptBR },
  );

  if (event.imageUrl) {
    return (
      <Card className="group h-full w-full gap-0 overflow-hidden p-0 transition-shadow duration-300 hover:shadow-md">
        <div className="relative aspect-3/4 w-full overflow-hidden bg-muted">
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
        <CardHeader className="gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="min-w-0 flex-1 text-lg leading-snug">
              {event.title}
            </CardTitle>
            <EventTypeBadge type={event.type} />
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0" />
              {dateLabel}
            </span>
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPinIcon className="size-4 shrink-0" />
                {event.location}
              </span>
            )}
          </div>
        </CardHeader>
        {event.description && (
          <CardContent className="px-4 pb-4">
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {event.description}
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="h-full w-full transition-shadow duration-300 hover:shadow-md">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 flex-1 text-lg leading-snug">
            {event.title}
          </CardTitle>
          <EventTypeBadge type={event.type} />
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0" />
            {dateLabel}
          </span>
          {event.location && (
            <span className="flex items-center gap-2">
              <MapPinIcon className="size-4 shrink-0" />
              {event.location}
            </span>
          )}
        </div>
      </CardHeader>
      {event.description && (
        <CardContent>
          <p className="line-clamp-4 text-sm text-muted-foreground">
            {event.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
};
