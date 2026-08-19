"use client";

import Image from "next/image";
import { CalendarIcon, MapPinIcon, PencilIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
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
            {showVisibility ? (
              <EventVisibilityBadge published={event.published} />
            ) : null}
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
            <EventTypeBadge type={event.type} />
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
              {event.location ? (
                <span className="flex items-start gap-2">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                  {event.location}
                </span>
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
