"use client";

import { CalendarDaysIcon, LayoutGridIcon, TableIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { EventsViewMode } from "@/modules/events/ui/hooks/use-events-view-mode";

type EventsViewModeToggleProps = {
  value: EventsViewMode;
  onChange: (mode: EventsViewMode) => void;
};

export const EventsViewModeToggle = ({
  value,
  onChange,
}: EventsViewModeToggleProps) => {
  const t = useTranslations("common");

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant={value === "grid" ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={t("viewGrid")}
        aria-pressed={value === "grid"}
        onClick={() => onChange("grid")}
      >
        <LayoutGridIcon />
      </Button>
      <Button
        type="button"
        variant={value === "table" ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={t("viewTable")}
        aria-pressed={value === "table"}
        onClick={() => onChange("table")}
      >
        <TableIcon />
      </Button>
      <Button
        type="button"
        variant={value === "calendar" ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={t("viewCalendar")}
        aria-pressed={value === "calendar"}
        onClick={() => onChange("calendar")}
      >
        <CalendarDaysIcon />
      </Button>
    </div>
  );
};
