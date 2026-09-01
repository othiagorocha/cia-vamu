import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  resolveEventColor,
  type EventColorId,
} from "@/modules/events/event-colors";
import type { EventRecord } from "@/modules/events/types";

export const EVENT_ADMIN_SCOPES = ["active", "archived"] as const;
export const EVENT_ADMIN_SORTS = ["manual", "dateAsc", "dateDesc"] as const;
export const EVENT_ADMIN_VISIBILITIES = ["all", "public", "team"] as const;
export const EVENT_ADMIN_IMPORTANT = ["all", "yes"] as const;
export const EVENT_ADMIN_TYPE_ALL = "all";

export type EventAdminScope = (typeof EVENT_ADMIN_SCOPES)[number];
export type EventAdminSort = (typeof EVENT_ADMIN_SORTS)[number];
export type EventAdminVisibility = (typeof EVENT_ADMIN_VISIBILITIES)[number];
export type EventAdminImportant = (typeof EVENT_ADMIN_IMPORTANT)[number];
export type EventAdminTypeFilter = typeof EVENT_ADMIN_TYPE_ALL | string;

export type EventAdminFilters = {
  q: string;
  type: EventAdminTypeFilter;
  visibility: EventAdminVisibility;
  color: "all" | EventColorId;
  important: EventAdminImportant;
  sort: EventAdminSort;
};

export const eventEffectiveEnd = (event: {
  startsAt: Date;
  endsAt: Date | null;
}) => new Date(event.endsAt ?? event.startsAt);

export const isEventArchived = (
  event: { startsAt: Date; endsAt: Date | null },
  now = new Date(),
) => eventEffectiveEnd(event).getTime() < now.getTime();

export const splitEventsByArchive = (
  events: EventRecord[],
  now = new Date(),
) => {
  const active: EventRecord[] = [];
  const archived: EventRecord[] = [];

  for (const event of events) {
    if (isEventArchived(event, now)) {
      archived.push(event);
    } else {
      active.push(event);
    }
  }

  return { active, archived };
};

export const eventHasListFilters = (filters: EventAdminFilters) =>
  Boolean(filters.q.trim()) ||
  filters.type !== "all" ||
  filters.visibility !== "all" ||
  filters.color !== "all" ||
  filters.important !== "all";

export const filterEvents = (
  events: EventRecord[],
  filters: EventAdminFilters,
) => {
  const query = filters.q.trim().toLowerCase();

  return events.filter((event) => {
    if (query && !event.title.toLowerCase().includes(query)) {
      return false;
    }

    if (filters.type !== "all" && event.type.slug !== filters.type) {
      return false;
    }

    if (filters.visibility === "public" && !event.published) {
      return false;
    }

    if (filters.visibility === "team" && event.published) {
      return false;
    }

    if (
      filters.color !== "all" &&
      resolveEventColor(event) !== filters.color
    ) {
      return false;
    }

    if (filters.important === "yes" && !event.important) {
      return false;
    }

    return true;
  });
};

export const sortEvents = (
  events: EventRecord[],
  sort: EventAdminSort,
) => {
  if (sort === "manual") {
    return events;
  }

  return [...events].sort((left, right) => {
    const delta =
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();

    return sort === "dateDesc" ? delta : -delta;
  });
};

export const groupEventsByMonth = (events: EventRecord[]) => {
  const groups = new Map<string, EventRecord[]>();

  for (const event of events) {
    const key = format(new Date(event.startsAt), "yyyy-MM");
    const current = groups.get(key);

    if (current) {
      current.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, groupEvents]) => {
      const label = format(new Date(groupEvents[0].startsAt), "MMMM yyyy", {
        locale: ptBR,
      });

      return {
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        events: groupEvents,
      };
    });
};
