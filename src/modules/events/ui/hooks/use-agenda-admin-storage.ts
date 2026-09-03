"use client";

import { useEffect, useRef } from "react";

import type { EventsViewMode } from "@/modules/events/ui/hooks/use-events-view-mode";
import type {
  EventAdminFilters,
  EventAdminScope,
} from "@/modules/events/event-status";
import {
  agendaUrlHasParams,
  readAgendaAdminStorage,
  writeAgendaAdminStorage,
} from "@/modules/events/ui/hooks/agenda-admin-storage";

type UseAgendaAdminStorageArgs = {
  scope: EventAdminScope;
  filters: EventAdminFilters;
  viewMode: EventsViewMode;
  setFilters: (
    patch: Partial<EventAdminFilters & { scope: EventAdminScope }>,
  ) => void;
  setViewMode: (view: EventsViewMode) => void | Promise<URLSearchParams>;
};

export const useAgendaAdminStorage = ({
  scope,
  filters,
  viewMode,
  setFilters,
  setViewMode,
}: UseAgendaAdminStorageArgs) => {
  const skipNextPersist = useRef(true);
  const didHydrate = useRef(false);

  useEffect(() => {
    if (didHydrate.current) {
      return;
    }

    didHydrate.current = true;

    if (agendaUrlHasParams()) {
      skipNextPersist.current = false;
      return;
    }

    const stored = readAgendaAdminStorage();
    if (!stored) {
      skipNextPersist.current = false;
      return;
    }

    setFilters({
      scope: stored.scope,
      q: stored.q,
      type: stored.type,
      visibility: stored.visibility,
      color: stored.color,
      important: stored.important,
      sort: stored.sort,
    });
    void setViewMode(stored.view);
  }, [setFilters, setViewMode]);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }

    writeAgendaAdminStorage({
      scope,
      ...filters,
      view: viewMode,
    });
  }, [filters, scope, viewMode]);
};
