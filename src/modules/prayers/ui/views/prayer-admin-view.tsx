"use client";

import { useState } from "react";
import { LayoutGridIcon, TableIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBrazilDateTimeShort } from "@/lib/brazil-datetime";
import { PrayerRequestDialog } from "@/modules/prayers/ui/components/prayer-request-dialog";
import { PrayerRequestForm } from "@/modules/prayers/ui/components/prayer-request-form";
import type { PrayerRequestRecord } from "@/modules/prayers/types";
import { trpc } from "@/trpc/client";

type PrayerAdminViewProps = {
  canManage: boolean;
};

type ViewMode = "grid" | "table";

const authorLabel = (
  request: PrayerRequestRecord,
  anonymousLabel: string,
) => (request.isAnonymous ? anonymousLabel : (request.name ?? anonymousLabel));

export const PrayerAdminView = ({ canManage }: PrayerAdminViewProps) => {
  const t = useTranslations("prayers");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const [requests] = trpc.prayers.list.useSuspenseQuery();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [openId, setOpenId] = useState<string | null>(null);

  const openRequest = requests.find((request) => request.id === openId) ?? null;

  const removeMutation = trpc.prayers.remove.useMutation({
    onSuccess: () => {
      toast.success(t("deleted"));
      setOpenId(null);
      utils.prayers.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDelete = (id: string) => {
    removeMutation.mutate({ id });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("adminTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("adminSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PrayerRequestForm
            onSuccess={() => {
              utils.prayers.list.invalidate();
            }}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={t("viewGrid")}
          aria-pressed={viewMode === "grid"}
          onClick={() => setViewMode("grid")}
        >
          <LayoutGridIcon />
        </Button>
        <Button
          type="button"
          variant={viewMode === "table" ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={t("viewTable")}
          aria-pressed={viewMode === "table"}
          onClick={() => setViewMode("table")}
        >
          <TableIcon />
        </Button>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              role="button"
              tabIndex={0}
              className="flex cursor-pointer flex-col gap-2 rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
              onClick={() => setOpenId(request.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpenId(request.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {authorLabel(request, t("anonymous"))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBrazilDateTimeShort(request.createdAt)}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={tCommon("actions.delete")}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(request.id);
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </div>
              <p className="line-clamp-4 text-sm text-muted-foreground">
                {request.body}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.author")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.body")}</TableHead>
                {canManage ? (
                  <TableHead>{t("columns.actions")}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow
                  key={request.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => setOpenId(request.id)}
                >
                  <TableCell className="font-medium">
                    {authorLabel(request, t("anonymous"))}
                  </TableCell>
                  <TableCell>
                    {formatBrazilDateTimeShort(request.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal">
                    <span className="line-clamp-2">{request.body}</span>
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={tCommon("actions.delete")}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(request.id);
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PrayerRequestDialog
        request={openRequest}
        open={openRequest !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOpenId(null);
          }
        }}
        canManage={canManage}
        onDelete={handleDelete}
        isDeleting={removeMutation.isPending}
      />
    </div>
  );
};

export const PrayerAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
};
