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
  SelectValue,
} from "@/components/ui/select";
import { EVENT_COLOR_IDS } from "@/modules/events/event-colors";
import {
  EVENT_ADMIN_SORTS,
  EVENT_ADMIN_TYPE_ALL,
  type EventAdminFilters,
  type EventAdminImportant,
  type EventAdminSort,
  type EventAdminTypeFilter,
  type EventAdminVisibility,
} from "@/modules/events/event-status";
import type { EventTypeRecord } from "@/modules/events/types";

type EventAdminFiltersBarProps = {
  filters: EventAdminFilters;
  types: EventTypeRecord[];
  onChange: (patch: Partial<EventAdminFilters>) => void;
  onReset: () => void;
  hasListFilters: boolean;
};

const selectTriggerClass = "h-8 w-full min-w-0";

export const EventAdminFiltersBar = ({
  filters,
  types,
  onChange,
  onReset,
  hasListFilters,
}: EventAdminFiltersBarProps) => {
  const t = useTranslations("events");
  const selectedType = types.find((type) => type.slug === filters.type);

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="relative w-full min-w-0">
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

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <Select
          value={filters.type}
          onValueChange={(value) =>
            onChange({ type: value as EventAdminTypeFilter })
          }
        >
          <SelectTrigger
            size="sm"
            className={selectTriggerClass}
            aria-label={t("filters.type")}
          >
            <SelectValue placeholder={t("filters.type")}>
              {filters.type === EVENT_ADMIN_TYPE_ALL
                ? t("filters.type")
                : (selectedType?.label ?? t("filters.type"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={EVENT_ADMIN_TYPE_ALL}>
              {t("filters.all")}
            </SelectItem>
            {types.map((type) => (
              <SelectItem key={type.id} value={type.slug}>
                {type.label}
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
            className={selectTriggerClass}
            aria-label={t("filters.visibility")}
          >
            <SelectValue placeholder={t("filters.visibility")} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">{t("filters.visibility")}</SelectItem>
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
            className={selectTriggerClass}
            aria-label={t("filters.color")}
          >
            <SelectValue placeholder={t("filters.color")} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">{t("filters.color")}</SelectItem>
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
            className={selectTriggerClass}
            aria-label={t("filters.important")}
          >
            <SelectValue placeholder={t("filters.important")} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">{t("filters.important")}</SelectItem>
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
            className={selectTriggerClass}
            aria-label={t("filters.sort")}
          >
            <SelectValue placeholder={t("filters.sort")} />
          </SelectTrigger>
          <SelectContent position="popper">
            {EVENT_ADMIN_SORTS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`sort.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasListFilters || filters.sort !== "manual" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={onReset}
        >
          {t("filters.reset")}
        </Button>
      ) : null}
    </div>
  );
};
