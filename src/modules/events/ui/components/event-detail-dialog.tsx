"use client";

import Image from "next/image";
import { CalendarIcon, PencilIcon, StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBrazilDateTime } from "@/lib/brazil-datetime";
import { eventLocationLabel } from "@/lib/google-maps-url";
import { cn } from "@/lib/utils";
import { resolveEventColor } from "@/modules/events/event-colors";
import { EventLocationLink } from "@/modules/events/ui/components/event-location-link";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import { EventVisibilityBadge } from "@/modules/events/ui/components/event-visibility-badge";
import type { EventRecord } from "@/modules/events/types";

type EventDetailDialogProps = {
  event: EventRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showVisibility?: boolean;
  onEdit?: () => void;
};

export const EventDetailDialog = ({
  event,
  open,
  onOpenChange,
  showVisibility = false,
  onEdit,
}: EventDetailDialogProps) => {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const startsAtLabel = formatBrazilDateTime(event.startsAt);
  const endsAtLabel = event.endsAt ? formatBrazilDateTime(event.endsAt) : null;
  const hasArt = Boolean(event.imageUrl);
  const locationLabel = eventLocationLabel(event);
  const color = resolveEventColor(event);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-lg">
        {hasArt ? (
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted">
            <Image
              src={event.imageUrl ?? ""}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 512px, 100vw"
            />
          </div>
        ) : null}

        <div
          className={cn(
            "flex flex-col px-5",
            hasArt ? "gap-5 pt-5" : "gap-6 pt-12",
            onEdit ? "pb-0" : "pb-5"
          )}
        >
          <DialogHeader className={hasArt ? "gap-3" : "gap-4"}>
            <DialogTitle
              className={cn(
                "pr-8 font-semibold leading-snug",
                hasArt ? "text-2xl" : "text-3xl tracking-tight"
              )}
            >
              {event.title}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              {showVisibility ? (
                <EventVisibilityBadge published={event.published} />
              ) : null}
              {event.important ? (
                <span
                  title={t("important")}
                  className="inline-flex size-6 items-center justify-center rounded-full bg-orange-400 text-black"
                >
                  <StarIcon className="size-3.5 fill-current" />
                  <span className="sr-only">{t("important")}</span>
                </span>
              ) : null}
            </div>
            <DialogDescription className="sr-only">
              {t("details")}
            </DialogDescription>
          </DialogHeader>

          {event.description ? (
            <p
              className={cn(
                "whitespace-pre-wrap leading-relaxed text-muted-foreground",
                hasArt ? "text-sm" : "text-base"
              )}
            >
              {event.description}
            </p>
          ) : null}

          <div className="flex flex-col items-start gap-3">
            <EventTypeBadge label={event.type.label} color={color} />
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="flex items-start gap-2">
                <CalendarIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  {startsAtLabel}
                  {endsAtLabel ? (
                    <span className="block text-xs">
                      {t("endsAt")}: {endsAtLabel}
                    </span>
                  ) : null}
                </span>
              </span>
              {locationLabel ? (
                <EventLocationLink
                  location={locationLabel}
                  mapsQuery={event.locationMapsQuery}
                  className="gap-2"
                  iconClassName="size-4"
                />
              ) : null}
            </div>
          </div>
        </div>

        {onEdit ? (
          <DialogFooter className="mx-0 mb-0 mt-5">
            <Button type="button" onClick={onEdit}>
              <PencilIcon />
              {tCommon("actions.edit")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
