"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardHeader } from "@/components/ui/card";
import { formatBrazilDateTime } from "@/lib/brazil-datetime";
import { cn } from "@/lib/utils";
import { EventDetailDialog } from "@/modules/events/ui/components/event-detail-dialog";
import { EventLocationLink } from "@/modules/events/ui/components/event-location-link";
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
        <Card
          size="sm"
          className="h-full w-full gap-0 py-0 transition-shadow duration-300 hover:shadow-md"
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={t("expand", { title: event.title })}
            className="flex min-h-0 w-full flex-1 cursor-pointer flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                actions && !hasArt && "pr-12",
                event.location && (hasArt ? "pb-2" : "pb-3")
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
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-muted-foreground",
                    hasArt ? "text-xs" : "text-sm"
                  )}
                >
                  <CalendarIcon className="size-3.5 shrink-0" />
                  <span className="line-clamp-1">{dateLabel}</span>
                </span>
              </div>
            </CardHeader>
          </button>
          {event.location ? (
            <div
              className={cn(
                "px-4 pb-4",
                hasArt ? "text-xs" : "px-5 pb-5 text-sm"
              )}
            >
              <EventLocationLink
                location={event.location}
                iconClassName={hasArt ? "mt-0 size-3.5" : "mt-0.5 size-3.5"}
              />
            </div>
          ) : null}
        </Card>
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
