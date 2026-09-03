"use client";

import { ListFilterIcon, SearchIcon } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_IDS } from "@/modules/events/event-colors";
import { eventTypeShareLine } from "@/modules/events/event-types";
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

export const EventAdminFiltersBar = ({
  filters,
  types,
  onChange,
  onReset,
  hasListFilters,
}: EventAdminFiltersBarProps) => {
  const t = useTranslations("events");
  const showReset = hasListFilters || filters.sort !== "manual";

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
      <div className="relative min-w-0 flex-1 basis-40 md:max-w-52">
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

      <div className="hidden min-w-0 flex-wrap items-center justify-end gap-2 md:flex">
        <FilterSelects
          filters={filters}
          types={types}
          triggerClassName="h-8 w-32"
          onChange={onChange}
        />
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant={hasListFilters ? "secondary" : "outline"}
            size="sm"
            className="md:hidden"
          >
            <ListFilterIcon />
            {t("filters.open")}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="gap-0">
          <SheetHeader>
            <SheetTitle>{t("filters.open")}</SheetTitle>
            <SheetDescription className="sr-only">
              {t("filters.search")}
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
            <FilterSelects
              filters={filters}
              types={types}
              triggerClassName="h-10 w-full"
              onChange={onChange}
            />
          </div>
          {showReset ? (
            <div className="border-t px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onReset}
              >
                {t("filters.reset")}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {showReset ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden md:inline-flex"
          onClick={onReset}
        >
          {t("filters.reset")}
        </Button>
      ) : null}
    </div>
  );
};

const FilterSelects = ({
  filters,
  types,
  triggerClassName,
  onChange,
}: {
  filters: EventAdminFilters;
  types: EventTypeRecord[];
  triggerClassName: string;
  onChange: (patch: Partial<EventAdminFilters>) => void;
}) => {
  const t = useTranslations("events");
  const selectedType = types.find((type) => type.slug === filters.type);

  return (
    <>
      <Select
        value={filters.type}
        onValueChange={(value) =>
          onChange({ type: value as EventAdminTypeFilter })
        }
      >
        <SelectTrigger
          size="sm"
          className={triggerClassName}
          aria-label={t("filters.type")}
        >
          <SelectValue placeholder={t("filters.type")}>
            {filters.type === EVENT_ADMIN_TYPE_ALL
              ? t("filters.type")
              : selectedType
                ? eventTypeShareLine(selectedType.emoji, selectedType.label)
                : t("filters.type")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={EVENT_ADMIN_TYPE_ALL}>
            {t("filters.all")}
          </SelectItem>
          {types.map((type) => (
            <SelectItem key={type.id} value={type.slug}>
              {eventTypeShareLine(type.emoji, type.label)}
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
          className={triggerClassName}
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
          className={cn(triggerClassName, "md:w-28")}
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
          className={triggerClassName}
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
          className={cn(triggerClassName, "md:w-40")}
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
    </>
  );
};
