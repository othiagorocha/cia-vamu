"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminViewMode } from "@/lib/admin-view-mode";
import { useToastError } from "@/lib/use-toast-error";
import { AdminViewModeToggle } from "@/modules/dashboard/ui/components/admin-view-mode-toggle";
import { EventCard } from "@/modules/events/ui/components/event-card";
import { EventDetailDialog } from "@/modules/events/ui/components/event-detail-dialog";
import { EventFormDialog } from "@/modules/events/ui/components/event-form-dialog";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import { EventVisibilityBadge } from "@/modules/events/ui/components/event-visibility-badge";
import type { EventFormInput } from "@/modules/events/schema";
import type { EventRecord } from "@/modules/events/types";
import { trpc } from "@/trpc/client";

export const EventsAdminView = ({ canWrite }: { canWrite: boolean }) => {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [events] = trpc.events.listAll.useSuspenseQuery();
  const [viewMode, setViewMode] = useAdminViewMode();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);

  const invalidate = () => {
    utils.events.listAll.invalidate();
    utils.events.listUpcoming.invalidate();
  };

  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success(t("updated"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const removeMutation = trpc.events.remove.useMutation({
    onSuccess: () => {
      toast.success(t("removed"));
      setDeleteTarget(null);
      invalidate();
    },
    onError: toastError,
  });

  const reorderMutation = trpc.events.reorder.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });

  const handleSubmit = (values: EventFormInput) => {
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openEditor = (event: EventRecord) => {
    if (!canWrite) {
      return;
    }

    setDetailEvent(null);
    setSelectedEvent(event);
    setFormOpen(true);
  };

  const eventActions = (event: EventRecord, index: number) =>
    canWrite ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("columns.actions")}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          <DropdownMenuItem
            disabled={index === 0 || reorderMutation.isPending}
            onClick={() =>
              reorderMutation.mutate({
                id: event.id,
                direction: "up",
              })
            }
          >
            <ArrowUpIcon />
            {t("moveUp")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={
              index === events.length - 1 || reorderMutation.isPending
            }
            onClick={() =>
              reorderMutation.mutate({
                id: event.id,
                direction: "down",
              })
            }
          >
            <ArrowDownIcon />
            {t("moveDown")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEditor(event)}>
            <PencilIcon />
            {tCommon("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteTarget(event)}
          >
            <Trash2Icon />
            {tCommon("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("adminTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("adminSubtitle", { hint: t("orderHint") })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 ? (
            <AdminViewModeToggle
              value={viewMode}
              onChange={(mode) => {
                void setViewMode(mode);
              }}
            />
          ) : null}
          {canWrite ? (
            <Button
              onClick={() => {
                setSelectedEvent(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon />
              {t("new")}
            </Button>
          ) : null}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p>{t("adminEmpty")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {events.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              showVisibility
              onEdit={canWrite ? () => openEditor(event) : undefined}
              actions={eventActions(event, index)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.title")}</TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.art")}</TableHead>
                <TableHead>{t("columns.startsAt")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-0">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event, index) => (
                <TableRow
                  key={event.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => setDetailEvent(event)}
                  onKeyDown={(keyboardEvent) => {
                    if (
                      keyboardEvent.key === "Enter" ||
                      keyboardEvent.key === " "
                    ) {
                      keyboardEvent.preventDefault();
                      setDetailEvent(event);
                    }
                  }}
                >
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>
                    <EventTypeBadge type={event.type} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.imageUrl ? "outline" : "secondary"}>
                      {event.imageUrl ? t("hasArt") : t("noArt")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(event.startsAt), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <EventVisibilityBadge published={event.published} />
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                      >
                        {eventActions(event, index)}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {detailEvent ? (
        <EventDetailDialog
          event={detailEvent}
          open
          onOpenChange={(open) => !open && setDetailEvent(null)}
          showVisibility
          onEdit={canWrite ? () => openEditor(detailEvent) : undefined}
        />
      ) : null}

      <EventFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setSelectedEvent(null);
          }
        }}
        event={selectedEvent}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && removeMutation.mutate({ id: deleteTarget.id })
              }
            >
              {tCommon("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const EventsAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
