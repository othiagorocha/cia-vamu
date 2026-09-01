"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { EVENT_COLOR_IDS } from "@/modules/events/event-colors";
import {
  EVENT_ADMIN_SORTS,
  EVENT_ADMIN_TYPES,
  type EventAdminFilters,
  type EventAdminImportant,
  type EventAdminSort,
  type EventAdminTypeFilter,
  type EventAdminVisibility,
} from "@/modules/events/event-status";

type EventAdminFiltersBarProps = {
  filters: EventAdminFilters;
  onChange: (patch: Partial<EventAdminFilters>) => void;
  onReset: () => void;
  hasListFilters: boolean;
};

export const EventAdminFiltersBar = ({
  filters,
  onChange,
  onReset,
  hasListFilters,
}: EventAdminFiltersBarProps) => {
  const t = useTranslations("events");

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-64">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="event-filter-q"
          value={filters.q}
          placeholder={t("filters.searchPlaceholder")}
          aria-label={t("filters.search")}
          className="h-8 pl-8"
          onChange={(event) => onChange({ q: event.target.value })}
        />
      </div>

      <Select
        value={filters.type}
        onValueChange={(value) =>
          onChange({ type: value as EventAdminTypeFilter })
        }
      >
        <SelectTrigger
          size="sm"
          className="w-[8.5rem]"
          aria-label={t("filters.type")}
        >
          {filters.type === "all"
            ? t("filters.type")
            : t(`types.${filters.type}`)}
        </SelectTrigger>
        <SelectContent>
          {EVENT_ADMIN_TYPES.map((option) => (
            <SelectItem key={option} value={option}>
              {option === "all" ? t("filters.all") : t(`types.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.visibility}
        onValueChange={(value) =>
          onChange({ visibility: value as EventAdminVisibility })
        }
      >
        <SelectTrigger
          size="sm"
          className="w-[9.5rem]"
          aria-label={t("filters.visibility")}
        >
          {filters.visibility === "all"
            ? t("filters.visibility")
            : t(`visibility.${filters.visibility === "public" ? "public" : "team"}`)}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.all")}</SelectItem>
          <SelectItem value="public">{t("visibility.public")}</SelectItem>
          <SelectItem value="team">{t("visibility.team")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.color}
        onValueChange={(value) =>
          onChange({
            color: value as EventAdminFilters["color"],
          })
        }
      >
        <SelectTrigger
          size="sm"
          className="w-[7.5rem]"
          aria-label={t("filters.color")}
        >
          {filters.color === "all"
            ? t("filters.color")
            : t(`colors.${filters.color}`)}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.all")}</SelectItem>
          {EVENT_COLOR_IDS.map((color) => (
            <SelectItem key={color} value={color}>
              {t(`colors.${color}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.important}
        onValueChange={(value) =>
          onChange({ important: value as EventAdminImportant })
        }
      >
        <SelectTrigger
          size="sm"
          className="w-[8.5rem]"
          aria-label={t("filters.important")}
        >
          {filters.important === "all"
            ? t("filters.important")
            : t("important")}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.all")}</SelectItem>
          <SelectItem value="yes">{t("important")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sort}
        onValueChange={(value) =>
          onChange({ sort: value as EventAdminSort })
        }
      >
        <SelectTrigger
          size="sm"
          className="w-[10rem]"
          aria-label={t("filters.sort")}
        >
          {t(`sort.${filters.sort}`)}
        </SelectTrigger>
        <SelectContent>
          {EVENT_ADMIN_SORTS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`sort.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasListFilters || filters.sort !== "manual" ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          {t("filters.reset")}
        </Button>
      ) : null}
    </div>
  );
};
