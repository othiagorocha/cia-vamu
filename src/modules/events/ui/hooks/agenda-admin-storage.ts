import {
  ADMIN_VIEW_MODES,
  type AdminViewMode,
} from "@/lib/admin-view-mode";
import { isEventColorId } from "@/modules/events/event-colors";
import {
  EVENT_ADMIN_IMPORTANT,
  EVENT_ADMIN_SCOPES,
  EVENT_ADMIN_SORTS,
  EVENT_ADMIN_VISIBILITIES,
  type EventAdminFilters,
  type EventAdminScope,
} from "@/modules/events/event-status";

export const AGENDA_ADMIN_STORAGE_KEY = "cia-vamu:admin-agenda";

export const AGENDA_ADMIN_URL_KEYS = [
  "scope",
  "q",
  "type",
  "visibility",
  "color",
  "important",
  "sort",
  "view",
] as const;

export type AgendaAdminStoredState = EventAdminFilters & {
  scope: EventAdminScope;
  view: AdminViewMode;
};

const isOneOf = <T extends string>(
  value: unknown,
  options: readonly T[],
): value is T => typeof value === "string" && options.includes(value as T);

export const agendaUrlHasParams = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  return AGENDA_ADMIN_URL_KEYS.some((key) => params.has(key));
};

export const readAgendaAdminStorage = (): AgendaAdminStoredState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AGENDA_ADMIN_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const value = parsed as Record<string, unknown>;
    const color =
      value.color === "all" || isEventColorId(String(value.color ?? ""))
        ? (value.color as AgendaAdminStoredState["color"])
        : null;

    if (
      !isOneOf(value.scope, EVENT_ADMIN_SCOPES) ||
      typeof value.q !== "string" ||
      typeof value.type !== "string" ||
      value.type.length === 0 ||
      !isOneOf(value.visibility, EVENT_ADMIN_VISIBILITIES) ||
      !color ||
      !isOneOf(value.important, EVENT_ADMIN_IMPORTANT) ||
      !isOneOf(value.sort, EVENT_ADMIN_SORTS) ||
      !isOneOf(value.view, ADMIN_VIEW_MODES)
    ) {
      return null;
    }

    return {
      scope: value.scope,
      q: value.q,
      type: value.type,
      visibility: value.visibility,
      color,
      important: value.important,
      sort: value.sort,
      view: value.view,
    };
  } catch {
    return null;
  }
};

export const writeAgendaAdminStorage = (state: AgendaAdminStoredState) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AGENDA_ADMIN_STORAGE_KEY, JSON.stringify(state));
};
