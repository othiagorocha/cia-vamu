"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardHeader } from "@/components/ui/card";
import { formatBrazilDateTime } from "@/lib/brazil-datetime";
import { cn } from "@/lib/utils";
import { EventDetailDialog } from "@/modules/events/ui/components/event-detail-dialog";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import { EventVisibilityBadge } from "@/modules/events/ui/components/event-visibility-badge";
import type { EventRecord } from "@/modules/events/types";

type EventCardProps = {
  event: EventRecord;
  showVisibility?: boolean;
  onEdit?: () => void;
  actions?: ReactNode;
};

export const EventCard = ({
  event,
  showVisibility = false,
  onEdit,
  actions,
}: EventCardProps) => {
  const t = useTranslations("events");
  const [open, setOpen] = useState(false);
  const dateLabel = formatBrazilDateTime(event.startsAt);
  const hasArt = Boolean(event.imageUrl);

  return (
    <>
      <article className="relative h-full">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={t("expand", { title: event.title })}
          className="h-full w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Card
            size="sm"
            className="h-full w-full gap-0 py-0 transition-shadow duration-300 hover:shadow-md"
          >
            {hasArt ? (
              <div className="relative flex h-60 w-full items-center justify-center overflow-hidden bg-muted">
                <Image
                  src={event.imageUrl ?? ""}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 85vw"
                />
                {showVisibility ? (
                  <div className="absolute left-2 top-2">
                    <EventVisibilityBadge published={event.published} />
                  </div>
                ) : null}
              </div>
            ) : null}

            <CardHeader
              className={cn(
                "flex flex-1 flex-col p-4",
                hasArt ? "gap-3" : "gap-4 p-5",
                actions && !hasArt && "pr-12"
              )}
            >
              <h2
                className={cn(
                  "font-semibold leading-[1.15] tracking-tight text-foreground",
                  hasArt
                    ? "text-lg"
                    : "text-2xl"
                )}
              >
                {event.title}
              </h2>

              {event.description ? (
                <p
                  className={cn(
                    "whitespace-pre-wrap leading-relaxed",
                    hasArt
                      ? "line-clamp-3 text-sm text-muted-foreground"
                      : "line-clamp-8 flex-1 text-base text-muted-foreground"
                  )}
                >
                  {event.description}
                </p>
              ) : null}

              <div className="mt-auto flex flex-col items-start gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {showVisibility && !hasArt ? (
                    <EventVisibilityBadge published={event.published} />
                  ) : null}
                  <EventTypeBadge type={event.type} />
                </div>
                <div
                  className={cn(
                    "flex flex-col gap-1 text-muted-foreground",
                    hasArt ? "text-xs" : "text-sm"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    <span className="line-clamp-1">{dateLabel}</span>
                  </span>
                  {event.location ? (
                    <span className="flex items-center gap-1.5">
                      <MapPinIcon className="size-3.5 shrink-0" />
                      <span className="line-clamp-1">{event.location}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </CardHeader>
          </Card>
        </button>
        {actions ? (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-background/90 p-0.5 shadow-sm">
            {actions}
          </div>
        ) : null}
      </article>

      <EventDetailDialog
        event={event}
        open={open}
        onOpenChange={setOpen}
        showVisibility={showVisibility}
        onEdit={
          onEdit
            ? () => {
                setOpen(false);
                onEdit();
              }
            : undefined
        }
      />
    </>
  );
};
