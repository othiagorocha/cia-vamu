"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eventLocationLabel } from "@/lib/google-maps-url";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import { EventVisibilityBadge } from "@/modules/events/ui/components/event-visibility-badge";
import { resolveEventColor } from "@/modules/events/event-colors";
import type { EventRecord } from "@/modules/events/types";

type EventsPublicTableProps = {
  events: EventRecord[];
  onEventClick: (event: EventRecord) => void;
  showVisibility?: boolean;
};

export const EventsPublicTable = ({
  events,
  onEventClick,
  showVisibility = false,
}: EventsPublicTableProps) => {
  const t = useTranslations("events");

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.title")}</TableHead>
            <TableHead>{t("columns.type")}</TableHead>
            {showVisibility ? (
              <TableHead>{t("columns.status")}</TableHead>
            ) : null}
            <TableHead>{t("columns.startsAt")}</TableHead>
            <TableHead>{t("columns.location")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow
              key={event.id}
              className="cursor-pointer"
              onClick={() => onEventClick(event)}
            >
              <TableCell className="max-w-[12rem] font-medium sm:max-w-xs">
                <span className="line-clamp-2">{event.title}</span>
              </TableCell>
              <TableCell>
                <EventTypeBadge
                  label={event.type.label}
                  emoji={event.type.emoji}
                  color={resolveEventColor(event)}
                />
              </TableCell>
              {showVisibility ? (
                <TableCell>
                  <EventVisibilityBadge published={event.published} />
                </TableCell>
              ) : null}
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {format(new Date(event.startsAt), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell className="max-w-[10rem] text-muted-foreground sm:max-w-xs">
                <span className="line-clamp-2">
                  {eventLocationLabel(event) ?? "—"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
