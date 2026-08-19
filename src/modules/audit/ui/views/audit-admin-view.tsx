"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBrazilDateTimeShort } from "@/lib/brazil-datetime";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  type AuditAction,
} from "@/modules/audit/actions";
import { AUDIT_PAGE_SIZE } from "@/modules/audit/schema";
import {
  getAuditChanges,
  type AuditChangeValue,
  type AuditLogRecord,
} from "@/modules/audit/types";
import { AuditChangesDrawer } from "@/modules/audit/ui/components/audit-changes-drawer";
import { trpc } from "@/trpc/client";

const ALL_VALUE = "all";

const AUDIT_ACTION_VALUES = new Set<string>(Object.values(AUDIT_ACTIONS));

const isAuditAction = (action: string): action is AuditAction =>
  AUDIT_ACTION_VALUES.has(action);

const FIELD_KEYS = [
  "name",
  "accessRole",
  "editorModules",
  "ministryRole",
  "isMember",
  "showOnAbout",
  "published",
  "title",
  "type",
  "location",
  "platform",
  "label",
  "photo",
  "read",
  "albumId",
] as const;

type FieldKey = (typeof FIELD_KEYS)[number];

const ACCESS_FIELDS = new Set<string>(["accessRole", "editorModules"]);

const CAPABILITY_LABEL: Record<string, "events" | "albums" | "site"> = {
  "events:write": "events",
  "albums:write": "albums",
  "site:write": "site",
};

const ACCESS_ROLES = ["member", "editor", "gestor"] as const;
const EVENT_TYPES = ["teatro", "viagem", "evangelismo", "outro"] as const;
const PLATFORMS = [
  "instagram",
  "youtube",
  "facebook",
  "whatsapp",
  "spotify",
  "other",
] as const;
const PHOTO_VALUES = ["set", "empty", "updated", "removed"] as const;

const isFieldKey = (field: string): field is FieldKey =>
  FIELD_KEYS.includes(field as FieldKey);

const targetLabel = (log: AuditLogRecord, anonymousLabel: string) => {
  const metadata = log.metadata;
  if (metadata.anonymous === true) {
    return anonymousLabel;
  }

  if (typeof metadata.title === "string" && metadata.title.trim()) {
    return metadata.title;
  }

  if (typeof metadata.name === "string" && metadata.name.trim()) {
    return metadata.name;
  }

  if (typeof metadata.label === "string" && metadata.label.trim()) {
    return metadata.label;
  }

  return log.entityId.slice(0, 8);
};

export const AuditAdminView = () => {
  const t = useTranslations("audit");
  const [staffList] = trpc.staff.list.useSuspenseQuery();
  const [actorUserId, setActorUserId] = useState(ALL_VALUE);
  const [module, setModule] = useState(ALL_VALUE);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const listInput = {
    actorUserId: actorUserId === ALL_VALUE ? undefined : actorUserId,
    module:
      module === ALL_VALUE
        ? undefined
        : (module as (typeof AUDIT_MODULES)[number]),
    from: from || undefined,
    to: to || undefined,
    offset,
    limit: AUDIT_PAGE_SIZE,
  };

  const listQuery = trpc.audit.list.useQuery(listInput);
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const page = Math.floor(offset / AUDIT_PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const hasFilters =
    actorUserId !== ALL_VALUE || module !== ALL_VALUE || Boolean(from) || Boolean(to);

  const formatModules = (value: string) => {
    return value
      .split(",")
      .map((capability) => {
        const key = CAPABILITY_LABEL[capability];
        return key ? t(`values.capability.${key}`) : capability;
      })
      .join(", ");
  };

  const formatValue = (field: string, value: AuditChangeValue) => {
    if (value === null) {
      return t("changesEmpty");
    }

    if (typeof value === "boolean") {
      if (field === "read") {
        return value ? t("values.read") : t("values.unread");
      }

      if (field === "published") {
        return value ? t("values.published") : t("values.draft");
      }

      return value ? t("values.yes") : t("values.no");
    }

    if (field === "accessRole" && ACCESS_ROLES.includes(value as (typeof ACCESS_ROLES)[number])) {
      return t(`values.accessRole.${value as (typeof ACCESS_ROLES)[number]}`);
    }

    if (field === "editorModules") {
      return formatModules(value);
    }

    if (field === "type" && EVENT_TYPES.includes(value as (typeof EVENT_TYPES)[number])) {
      return t(`values.eventType.${value as (typeof EVENT_TYPES)[number]}`);
    }

    if (field === "platform" && PLATFORMS.includes(value as (typeof PLATFORMS)[number])) {
      return t(`values.platform.${value as (typeof PLATFORMS)[number]}`);
    }

    if (field === "photo" && PHOTO_VALUES.includes(value as (typeof PHOTO_VALUES)[number])) {
      return t(`values.photo.${value as (typeof PHOTO_VALUES)[number]}`);
    }

    if (field === "albumId") {
      return value.slice(0, 8);
    }

    return value;
  };

  const fieldLabel = (field: string) =>
    isFieldKey(field) ? t(`fields.${field}`) : field;

  const actionLabel = (log: AuditLogRecord) => {
    const changes = getAuditChanges(log.metadata);

    if (
      changes.length > 0 &&
      changes.every((change) => ACCESS_FIELDS.has(change.field))
    ) {
      return t("actionByField.accessRole");
    }

    if (changes.length === 1 && isFieldKey(changes[0].field)) {
      return t(`actionByField.${changes[0].field}`);
    }

    if (!isAuditAction(log.action)) {
      return log.action;
    }

    return t(`actions.${log.action}`);
  };

  const selectedChanges = selectedLog
    ? getAuditChanges(selectedLog.metadata).map((change) => ({
        field: fieldLabel(change.field),
        from: formatValue(change.field, change.from),
        to: formatValue(change.field, change.to),
      }))
    : [];

  const applyFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setOffset(0);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-actor">{t("filters.person")}</Label>
          <Select
            value={actorUserId}
            onValueChange={(value) => applyFilter(setActorUserId, value)}
          >
            <SelectTrigger id="audit-actor" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t("filters.personAll")}</SelectItem>
              {staffList.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-module">{t("filters.module")}</Label>
          <Select
            value={module}
            onValueChange={(value) => applyFilter(setModule, value)}
          >
            <SelectTrigger id="audit-module" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t("filters.moduleAll")}</SelectItem>
              {AUDIT_MODULES.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`modules.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-from">{t("filters.from")}</Label>
          <Input
            id="audit-from"
            type="date"
            value={from}
            onChange={(event) => applyFilter(setFrom, event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-to">{t("filters.to")}</Label>
          <Input
            id="audit-to"
            type="date"
            value={to}
            onChange={(event) => applyFilter(setTo, event.target.value)}
          />
        </div>
      </div>

      {items.length === 0 && !listQuery.isLoading ? (
        <p className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          {hasFilters ? t("emptyFiltered") : t("empty")}
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.when")}</TableHead>
                <TableHead>{t("columns.person")}</TableHead>
                <TableHead>{t("columns.action")}</TableHead>
                <TableHead>{t("columns.target")}</TableHead>
                <TableHead>{t("columns.changes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("loading")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((log) => {
                  const hasChanges = getAuditChanges(log.metadata).length > 0;

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatBrazilDateTimeShort(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{log.actorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {log.actorEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{actionLabel(log)}</TableCell>
                      <TableCell>{targetLabel(log, t("anonymous"))}</TableCell>
                      <TableCell>
                        {hasChanges ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            {t("viewChanges")}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">
                            {t("changesEmpty")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AuditChangesDrawer
        open={Boolean(selectedLog)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
          }
        }}
        action={selectedLog ? actionLabel(selectedLog) : ""}
        target={selectedLog ? targetLabel(selectedLog, t("anonymous")) : ""}
        actorName={selectedLog?.actorName ?? ""}
        when={
          selectedLog ? formatBrazilDateTimeShort(selectedLog.createdAt) : ""
        }
        changes={selectedChanges}
      />

      {total > AUDIT_PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t("pagination.page", { page, pages: pageCount })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset === 0 || listQuery.isFetching}
              onClick={() => setOffset(Math.max(0, offset - AUDIT_PAGE_SIZE))}
            >
              <ChevronLeftIcon />
              {t("pagination.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset + AUDIT_PAGE_SIZE >= total || listQuery.isFetching}
              onClick={() => setOffset(offset + AUDIT_PAGE_SIZE)}
            >
              {t("pagination.next")}
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AuditAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
};
