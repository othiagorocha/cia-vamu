"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  EVENT_COLOR_IDS,
  EVENT_COLOR_STYLES,
  EVENT_TYPE_DEFAULT_COLOR,
  type EventColorId,
} from "@/modules/events/event-colors";
import type { EventType } from "@/modules/events/types";

type EventColorPickerProps = {
  type: EventType;
  value: EventColorId | null;
  onChange: (value: EventColorId | null) => void;
};

export const EventColorPicker = ({
  type,
  value,
  onChange,
}: EventColorPickerProps) => {
  const t = useTranslations("events");
  const typeColor = EVENT_TYPE_DEFAULT_COLOR[type];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
            value === null
              ? "border-foreground/40 bg-muted"
              : "border-border hover:bg-muted/60",
          )}
        >
          <span
            className={cn(
              "size-3.5 rounded-full",
              EVENT_COLOR_STYLES[typeColor].swatch,
            )}
          />
          {t("colors.useType")}
        </button>
        {EVENT_COLOR_IDS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-pressed={value === color}
            aria-label={t(`colors.${color}`)}
            title={t(`colors.${color}`)}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg border transition-colors",
              value === color
                ? "border-foreground/50 ring-2 ring-foreground/20"
                : "border-border hover:bg-muted/60",
            )}
          >
            <span
              className={cn(
                "size-4 rounded-full",
                EVENT_COLOR_STYLES[color].swatch,
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
};
