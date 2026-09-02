"use client";

import type { ReactNode } from "react";
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
  actions,
  enableSocial,
  canModerateSocial,
}: EventSortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: event.id,
    disabled,
    animateLayoutChanges: () => false,
  });

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
        !disabled && "cursor-grab touch-none active:cursor-grabbing",
      )}
      {...attributes}
      {...listeners}
    >
      <EventCard
        event={event}
        showVisibility={showVisibility}
        onEdit={onEdit}
        actions={actions}
        shake={shake && !isDragging}
        enableSocial={enableSocial}
        canModerateSocial={canModerateSocial}
      />
    </div>
  );
};
