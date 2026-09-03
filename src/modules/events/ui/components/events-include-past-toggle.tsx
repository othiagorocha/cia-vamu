"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EventsIncludePastToggleProps = {
  value: boolean;
  onChange: (includePast: boolean) => void;
  className?: string;
};

export const EventsIncludePastToggle = ({
  value,
  onChange,
  className,
}: EventsIncludePastToggleProps) => {
  const t = useTranslations("events.includePast");

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center rounded-lg border bg-background p-0.5",
        className,
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={value ? "ghost" : "secondary"}
        className="h-8 px-2.5 text-xs sm:px-3 sm:text-sm"
        aria-pressed={!value}
        onClick={() => onChange(false)}
      >
        {t("upcoming")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value ? "secondary" : "ghost"}
        className="h-8 px-2.5 text-xs sm:px-3 sm:text-sm"
        aria-pressed={value}
        onClick={() => onChange(true)}
      >
        {t("all")}
      </Button>
    </div>
  );
};
