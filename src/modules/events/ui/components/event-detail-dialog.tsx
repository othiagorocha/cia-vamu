"use client";

import Image from "next/image";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CalendarIcon,
  CopyIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
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
import {
  EVENT_COLOR_STYLES,
  resolveEventColor,
} from "@/modules/events/event-colors";
import { EventLocationLink } from "@/modules/events/ui/components/event-location-link";
import { EventSocial } from "@/modules/events/ui/components/event-social";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import { EventVisibilityBadge } from "@/modules/events/ui/components/event-visibility-badge";
import type { EventRecord } from "@/modules/events/types";

type EventDetailDialogProps = {
  event: EventRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showVisibility?: boolean;
  onEdit?: () => void;
  onRestore?: () => void;
  onReuse?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  restorePending?: boolean;
  archivePending?: boolean;
  deletePending?: boolean;
  enableSocial?: boolean;
  canModerateSocial?: boolean;
  focusCommentComposer?: boolean;
};

export const EventDetailDialog = ({
  event,
  open,
  onOpenChange,
  showVisibility = false,
  onEdit,
  onRestore,
  onReuse,
  onArchive,
  onDelete,
  restorePending = false,
  archivePending = false,
  deletePending = false,
  enableSocial = false,
  canModerateSocial = false,
  focusCommentComposer = false,
}: EventDetailDialogProps) => {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const startsAtLabel = formatBrazilDateTime(event.startsAt);
  const endsAtLabel = event.endsAt ? formatBrazilDateTime(event.endsAt) : null;
  const hasArt = Boolean(event.imageUrl);
  const locationLabel = eventLocationLabel(event);
  const color = resolveEventColor(event);
  const styles = EVENT_COLOR_STYLES[color];
  const hasPrimaryActions = Boolean(onEdit || onRestore || onReuse);
  const hasDangerActions = Boolean(onArchive || onDelete);
  const hasFooter = hasPrimaryActions || hasDangerActions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto p-0 sm:max-w-lg",
          styles.dialog,
          event.important &&
            "ring-2 ring-orange-400 shadow-[0_0_28px_-10px_rgba(251,146,60,0.7)]",
        )}
      >
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
            hasArt ? "gap-4 pt-5" : "gap-5 pt-12",
            hasFooter || enableSocial ? "pb-0" : "pb-5",
          )}
        >
          <DialogHeader className="gap-2.5">
            <DialogTitle
              className={cn(
                "pr-8 font-semibold leading-snug",
                hasArt ? "text-2xl" : "text-3xl tracking-tight",
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
                hasArt ? "text-sm" : "text-base",
              )}
            >
              {event.description}
            </p>
          ) : null}

          <div className="flex flex-col gap-2.5 rounded-lg bg-muted/40 px-3 py-3 ring-1 ring-foreground/5">
            <EventTypeBadge
              label={event.type.label}
              emoji={event.type.emoji}
              color={color}
            />
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
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

        {enableSocial ? (
          <EventSocial
            eventId={event.id}
            canModerate={canModerateSocial}
            focusComposerOnMount={focusCommentComposer}
          />
        ) : null}

        {hasFooter ? (
          <DialogFooter className="mx-0 mb-0 flex-col gap-3 border-t border-foreground/10 bg-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
            {hasDangerActions ? (
              <div className="order-last flex w-full gap-2 sm:order-first sm:w-auto">
                {onArchive ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    disabled={archivePending}
                    onClick={onArchive}
                  >
                    <ArchiveIcon />
                    {t("archive")}
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-11 flex-1 sm:flex-none"
                    disabled={deletePending}
                    onClick={onDelete}
                  >
                    <Trash2Icon />
                    {tCommon("actions.delete")}
                  </Button>
                ) : null}
              </div>
            ) : (
              <span className="hidden sm:block" />
            )}

            {hasPrimaryActions ? (
              <div className="order-first flex w-full flex-col gap-2 sm:order-last sm:w-auto sm:flex-row">
                {onEdit ? (
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    onClick={onEdit}
                  >
                    <PencilIcon />
                    {tCommon("actions.edit")}
                  </Button>
                ) : null}
                {onRestore ? (
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={restorePending}
                    onClick={onRestore}
                  >
                    <ArchiveRestoreIcon />
                    {t("restore")}
                  </Button>
                ) : null}
                {onReuse ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full sm:w-auto"
                    onClick={onReuse}
                  >
                    <CopyIcon />
                    {t("reuse")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
