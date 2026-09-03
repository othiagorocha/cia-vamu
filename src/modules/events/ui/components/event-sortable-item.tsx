"use client";

import { useState, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventCard } from "@/modules/events/ui/components/event-card";
import type { EventRecord } from "@/modules/events/types";

type EventSortableItemProps = {
  event: EventRecord;
  disabled?: boolean;
  shake: boolean;
  showVisibility?: boolean;
  onEdit?: () => void;
  onRestore?: () => void;
  onReuse?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  restorePending?: boolean;
  archivePending?: boolean;
  deletePending?: boolean;
  actions?: ReactNode;
  enableSocial?: boolean;
  canModerateSocial?: boolean;
};

export const EventSortableItem = ({
  event,
  disabled = false,
  shake,
  showVisibility,
  onEdit,
  onRestore,
  onReuse,
  onArchive,
  onDelete,
  restorePending,
  archivePending,
  deletePending,
  actions,
  enableSocial,
  canModerateSocial,
}: EventSortableItemProps) => {
  const t = useTranslations("events.filters");
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: event.id,
    disabled: disabled || dialogOpen,
    animateLayoutChanges: () => false,
  });

  const canActivate = !disabled && !dialogOpen;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={cn("h-full", isDragging && "opacity-40")}
    >
      <EventCard
        event={event}
        showVisibility={showVisibility}
        onEdit={onEdit}
        onRestore={onRestore}
        onReuse={onReuse}
        onArchive={onArchive}
        onDelete={onDelete}
        restorePending={restorePending}
        archivePending={archivePending}
        deletePending={deletePending}
        actions={actions}
        dragHandle={
          canActivate ? (
            <Button
              ref={setActivatorNodeRef}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("dndHandle")}
              className="min-h-11 min-w-11 cursor-grab touch-none sm:min-h-7 sm:min-w-7 active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVerticalIcon />
            </Button>
          ) : null
        }
        shake={shake && !isDragging}
        enableSocial={enableSocial}
        canModerateSocial={canModerateSocial}
        onDialogOpenChange={setDialogOpen}
      />
    </div>
  );
};
