"use client";

import { useEffect } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { eventsCalendarMonthParser } from "@/modules/events/ui/hooks/use-events-calendar-month";

export const EVENTS_VIEW_MODES = ["calendar", "grid", "table"] as const;

export type EventsViewMode = (typeof EVENTS_VIEW_MODES)[number];

const viewQueryOptions = { history: "replace" as const };

export const eventsViewModeParser = parseAsStringLiteral(EVENTS_VIEW_MODES)
  .withDefault("calendar")
  .withOptions(viewQueryOptions);

export const publicEventsViewModeParser = parseAsStringLiteral(EVENTS_VIEW_MODES)
  .withDefault("calendar")
  .withOptions(viewQueryOptions);

const useSyncedEventsViewMode = (
  parser: typeof eventsViewModeParser | typeof publicEventsViewModeParser,
) => {
  const [viewMode, setViewModeState] = useQueryState("view", parser);
  const [monthKey, setMonthKey] = useQueryState("month", eventsCalendarMonthParser);

  useEffect(() => {
    if (viewMode !== "calendar" && monthKey) {
      void setMonthKey(null);
    }
  }, [viewMode, monthKey, setMonthKey]);

  const setViewMode = (mode: EventsViewMode) => {
    if (mode !== "calendar") {
      void setMonthKey(null);
    }

    void setViewModeState(mode);
  };

  return [viewMode, setViewMode] as const;
};

export const useEventsViewMode = () => useSyncedEventsViewMode(eventsViewModeParser);

export const usePublicEventsViewMode = () =>
  useSyncedEventsViewMode(publicEventsViewModeParser);
