"use client";

import { useState, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: event.id,
    disabled: disabled || dialogOpen,
    animateLayoutChanges: () => false,
  });

  const dragProps = dialogOpen ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={cn(
        "h-full",
        isDragging && "opacity-40",
        !disabled && !dialogOpen && "cursor-grab touch-none active:cursor-grabbing",
      )}
      {...dragProps}
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
        shake={shake && !isDragging}
        enableSocial={enableSocial}
        canModerateSocial={canModerateSocial}
        onDialogOpenChange={setDialogOpen}
      />
    </div>
  );
};
