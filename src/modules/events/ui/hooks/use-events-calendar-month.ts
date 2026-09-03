"use client";

import { parseAsString, useQueryState } from "nuqs";

import { getBrazilNow } from "@/lib/brazil-datetime";
import { parseMonthKey } from "@/modules/events/event-status";

export const eventsCalendarMonthParser = parseAsString.withOptions({
  history: "replace",
});

export const normalizeMonthKey = (value: string | null | undefined) => {
  const fallback = getBrazilNow().monthKey;

  if (!value || !parseMonthKey(value)) {
    return fallback;
  }

  return value;
};

export const useEventsCalendarMonth = () => {
  const [monthKey, setMonthKey] = useQueryState("month", eventsCalendarMonthParser);

  return [normalizeMonthKey(monthKey), setMonthKey] as const;
};

export const shiftMonthKey = (monthKey: string, delta: number) => {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return getBrazilNow().monthKey;
  }

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1 + delta, 1, 12));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};
