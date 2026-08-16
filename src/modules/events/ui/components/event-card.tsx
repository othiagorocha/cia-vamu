"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBrazilDateTime } from "@/lib/brazil-datetime";
import { EventDetailDialog } from "@/modules/events/ui/components/event-detail-dialog";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import type { EventRecord } from "@/modules/events/types";

export const EventCard = ({ event }: { event: EventRecord }) => {
  const t = useTranslations("events");
  const [open, setOpen] = useState(false);
  const dateLabel = formatBrazilDateTime(event.startsAt);

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-label={t("expand", { title: event.title })}
        className='h-full w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background'>
        <Card size='sm' className='h-full w-full gap-0 py-0 transition-shadow duration-300 hover:shadow-md'>
          <div className="relative flex h-60 w-full items-center justify-center overflow-hidden bg-muted">
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 85vw"
              />
            ) : (
              <Logo variant="orange" className="size-24" />
            )}
          </div>

          <CardHeader className='gap-2 p-3'>
            <div className='flex items-start justify-between gap-2'>
              <CardTitle className='min-w-0 flex-1 line-clamp-2'>{event.title}</CardTitle>
              <EventTypeBadge type={event.type} />
            </div>
            <div className='flex flex-col gap-1 text-xs text-muted-foreground'>
              <span className='flex items-center gap-1.5'>
                <CalendarIcon className='size-3.5 shrink-0' />
                <span className='line-clamp-1'>{dateLabel}</span>
              </span>
              {event.location ? (
                <span className='flex items-center gap-1.5'>
                  <MapPinIcon className='size-3.5 shrink-0' />
                  <span className='line-clamp-1'>{event.location}</span>
                </span>
              ) : null}
            </div>
          </CardHeader>
        </Card>
      </button>

      <EventDetailDialog event={event} open={open} onOpenChange={setOpen} />
    </>
  );
};
