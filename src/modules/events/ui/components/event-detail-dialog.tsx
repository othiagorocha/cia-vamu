"use client";

import Image from "next/image";
import { CalendarIcon, MapPinIcon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-lg">
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 512px, 100vw"
            />
          ) : (
            <Logo variant="orange" className="size-28" />
          )}
        </div>

        <div className={onEdit ? "flex flex-col gap-5 px-5 pt-5" : "flex flex-col gap-5 p-5"}>
          <DialogHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-2xl font-semibold leading-snug">
                {event.title}
              </DialogTitle>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <EventTypeBadge type={event.type} />
                {showVisibility ? (
                  <EventVisibilityBadge published={event.published} />
                ) : null}
              </div>
            </div>
            <DialogDescription className="sr-only">
              {t("details")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span className="flex items-start gap-2">
              <CalendarIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                {startsAtLabel}
                {endsAtLabel ? (
                  <>
                    <span className="block text-xs">
                      {t("endsAt")}: {endsAtLabel}
                    </span>
                  </>
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

          {event.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {event.description}
            </p>
          ) : null}
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
