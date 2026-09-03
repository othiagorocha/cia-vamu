"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { formatBrazilTime, getBrazilNow } from "@/lib/brazil-datetime";
import { cn } from "@/lib/utils";
import {
  EVENT_COLOR_STYLES,
  resolveEventColor,
} from "@/modules/events/event-colors";
import {
  buildCalendarDays,
  groupEventsByDay,
  parseMonthKey,
} from "@/modules/events/event-status";
import {
  shiftMonthKey,
  useEventsCalendarMonth,
} from "@/modules/events/ui/hooks/use-events-calendar-month";
import type { EventRecord } from "@/modules/events/types";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const VISIBLE_EVENTS_PER_DAY = 3;

type EventsCalendarProps = {
  events: EventRecord[];
  onEventClick: (event: EventRecord) => void;
  onDayClick?: (dayKey: string) => void;
  className?: string;
};

export const EventsCalendar = ({
  events,
  onEventClick,
  onDayClick,
  className,
}: EventsCalendarProps) => {
  const t = useTranslations("events.calendar");
  const [monthKey, setMonthKey] = useEventsCalendarMonth();
  const brazilNow = getBrazilNow();

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const calendarDays = useMemo(() => buildCalendarDays(monthKey), [monthKey]);

  const monthLabel = useMemo(() => {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) {
      return monthKey;
    }

    const label = format(
      new Date(Date.UTC(parsed.year, parsed.month - 1, 1, 12)),
      "MMMM yyyy",
      { locale: ptBR },
    );

    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [monthKey]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void setMonthKey(shiftMonthKey(monthKey, -1))}
            aria-label={t("prevMonth")}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void setMonthKey(brazilNow.monthKey)}
          >
            {t("today")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void setMonthKey(shiftMonthKey(monthKey, 1))}
            aria-label={t("nextMonth")}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[20rem] rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAY_LABELS.map((label, index) => (
              <div
                key={`${label}-${index}`}
                className="px-1 py-2 text-center text-[11px] font-medium text-muted-foreground sm:text-xs"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              if (!day.inMonth || !day.dayKey || day.dayNumber === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    aria-hidden
                    className="min-h-20 border-b border-r bg-muted/10 p-1 sm:min-h-24"
                  />
                );
              }

              const dayKey = day.dayKey;
              const dayEvents = eventsByDay.get(dayKey) ?? [];
              const visibleEvents = dayEvents.slice(0, VISIBLE_EVENTS_PER_DAY);
              const hiddenCount = dayEvents.length - visibleEvents.length;
              const isToday = dayKey === brazilNow.dayKey;
              const dayAriaLabel = onDayClick
                ? t("createOnDay", {
                    date: format(parseISO(dayKey), "d 'de' MMMM", {
                      locale: ptBR,
                    }),
                  })
                : undefined;

              return (
                <div
                  key={dayKey}
                  role={onDayClick ? "button" : undefined}
                  tabIndex={onDayClick ? 0 : undefined}
                  aria-label={dayAriaLabel}
                  onClick={
                    onDayClick
                      ? () => {
                          onDayClick(dayKey);
                        }
                      : undefined
                  }
                  onKeyDown={
                    onDayClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onDayClick(dayKey);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "flex min-h-20 flex-col gap-1 border-b border-r p-1 sm:min-h-24",
                    isToday && "bg-orange-400/5",
                    onDayClick &&
                      "cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-inset",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-medium sm:text-xs",
                        isToday && "bg-orange-400 text-black",
                      )}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    {visibleEvents.map((event) => {
                      const color = resolveEventColor(event);
                      const styles = EVENT_COLOR_STYLES[color];

                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            onEventClick(event);
                          }}
                          className={cn(
                            "w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight sm:text-[11px]",
                            styles.card,
                            "hover:opacity-90",
                          )}
                          title={event.title}
                        >
                          <span className="mr-1 opacity-80">
                            {formatBrazilTime(event.startsAt)}
                          </span>
                          {event.title}
                        </button>
                      );
                    })}
                    {hiddenCount > 0 ? (
                      <span className="px-1 text-[10px] text-muted-foreground sm:text-[11px]">
                        {t("moreEvents", { count: hiddenCount })}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const EventsCalendarSkeleton = () => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="h-7 w-36 animate-pulse rounded bg-muted/60" />
        <div className="flex gap-1">
          <div className="h-8 w-8 animate-pulse rounded bg-muted/60" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted/60" />
          <div className="h-8 w-8 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
      <div className="h-88 animate-pulse rounded-lg border bg-muted/30 sm:h-104" />
    </div>
  );
};
