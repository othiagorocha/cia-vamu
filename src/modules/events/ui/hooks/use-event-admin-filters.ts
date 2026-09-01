"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { EVENT_COLOR_IDS } from "@/modules/events/event-colors";
import {
  EVENT_ADMIN_IMPORTANT,
  EVENT_ADMIN_SCOPES,
  EVENT_ADMIN_SORTS,
  EVENT_ADMIN_TYPES,
  EVENT_ADMIN_VISIBILITIES,
  eventHasListFilters,
  type EventAdminFilters,
} from "@/modules/events/event-status";

const COLOR_FILTERS = ["all", ...EVENT_COLOR_IDS] as const;

const filterOptions = { history: "replace" as const };

export const useEventAdminFilters = () => {
  const [state, setState] = useQueryStates({
    scope: parseAsStringLiteral(EVENT_ADMIN_SCOPES)
      .withDefault("active")
      .withOptions(filterOptions),
    q: parseAsString.withDefault("").withOptions(filterOptions),
    type: parseAsStringLiteral(EVENT_ADMIN_TYPES)
      .withDefault("all")
      .withOptions(filterOptions),
    visibility: parseAsStringLiteral(EVENT_ADMIN_VISIBILITIES)
      .withDefault("all")
      .withOptions(filterOptions),
    color: parseAsStringLiteral(COLOR_FILTERS)
      .withDefault("all")
      .withOptions(filterOptions),
    important: parseAsStringLiteral(EVENT_ADMIN_IMPORTANT)
      .withDefault("all")
      .withOptions(filterOptions),
    sort: parseAsStringLiteral(EVENT_ADMIN_SORTS)
      .withDefault("manual")
      .withOptions(filterOptions),
  });

  const filters: EventAdminFilters = {
    q: state.q,
    type: state.type,
    visibility: state.visibility,
    color: state.color,
    important: state.important,
    sort: state.sort,
  };

  const resetFilters = () => {
    void setState({
      q: "",
      type: "all",
      visibility: "all",
      color: "all",
      important: "all",
      sort: "manual",
    });
  };

  return {
    scope: state.scope,
    setScope: (scope: (typeof EVENT_ADMIN_SCOPES)[number]) => {
      void setState({ scope });
    },
    filters,
    setFilters: setState,
    hasListFilters: eventHasListFilters(filters),
    resetFilters,
  };
};
