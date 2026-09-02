"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArchiveRestoreIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  StarIcon,
  TagsIcon,
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { cn } from "@/lib/utils";
import { useToastError } from "@/lib/use-toast-error";
import { AdminViewModeToggle } from "@/modules/dashboard/ui/components/admin-view-mode-toggle";
import {
  EVENT_COLOR_STYLES,
  resolveEventColor,
} from "@/modules/events/event-colors";
import { eventTypeShareLine } from "@/modules/events/event-types";
import {
  filterEvents,
  groupEventsByMonth,
  isEventArchived,
  sortEvents,
  splitEventsByArchive,
} from "@/modules/events/event-status";
import { EventAdminFiltersBar } from "@/modules/events/ui/components/event-admin-filters";
import { EventCard } from "@/modules/events/ui/components/event-card";
import { EventDetailDialog } from "@/modules/events/ui/components/event-detail-dialog";
import { EventFormDialog } from "@/modules/events/ui/components/event-form-dialog";
import { EventShareMenuItems } from "@/modules/events/ui/components/event-share-menu-items";
import { EventSortableItem } from "@/modules/events/ui/components/event-sortable-item";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import { EventTypesDialog } from "@/modules/events/ui/components/event-types-dialog";
import { EventVisibilityBadge } from "@/modules/events/ui/components/event-visibility-badge";
import { useAgendaAdminStorage } from "@/modules/events/ui/hooks/use-agenda-admin-storage";
import { useEventAdminFilters } from "@/modules/events/ui/hooks/use-event-admin-filters";
import type { EventFormInput } from "@/modules/events/schema";
import type { EventRecord } from "@/modules/events/types";
import { trpc } from "@/trpc/client";

const applyActiveEventOrder = (
  orderedIds: string[],
  events: EventRecord[],
) => {
  const byId = new Map(events.map((event) => [event.id, event]));
  const nextActive = orderedIds.flatMap((id) => {
    const event = byId.get(id);
    return event ? [event] : [];
  });
  const archived = events.filter((event) => isEventArchived(event));

  return [...nextActive, ...archived];
};

export const EventsAdminView = ({
  canWrite,
  canManageTypes,
}: {
  canWrite: boolean;
  canManageTypes: boolean;
}) => {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [events] = trpc.events.listAll.useSuspenseQuery();
  const [types] = trpc.eventTypes.list.useSuspenseQuery();
  const [viewMode, setViewMode] = useAdminViewMode();
  const { scope, setScope, filters, setFilters, hasListFilters, resetFilters } =
    useEventAdminFilters();
  useAgendaAdminStorage({
    scope,
    filters,
    viewMode: viewMode ?? "grid",
    setFilters,
    setViewMode,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [prefillEvent, setPrefillEvent] = useState<EventRecord | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const { active, archived } = useMemo(
    () => splitEventsByArchive(events),
    [events],
  );

  const scopedEvents = scope === "active" ? active : archived;
  const visibleEvents = useMemo(
    () => sortEvents(filterEvents(scopedEvents, filters), filters.sort),
    [scopedEvents, filters],
  );
  const archivedGroups = useMemo(
    () => (scope === "archived" ? groupEventsByMonth(visibleEvents) : []),
    [scope, visibleEvents],
  );

  const canDrag =
    canWrite &&
    scope === "active" &&
    viewMode === "grid" &&
    filters.sort === "manual" &&
    !hasListFilters;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const invalidate = () => {
    utils.events.listAll.invalidate();
    utils.events.listUpcoming.invalidate();
  };

  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      setFormOpen(false);
      setPrefillEvent(null);
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
    onError: toastError,
    onSettled: () => {
      utils.events.listUpcoming.invalidate();
    },
  });

  const changeTypeMutation = trpc.events.changeType.useMutation({
    onSuccess: () => {
      toast.success(t("typeUpdated"));
      invalidate();
    },
    onError: toastError,
  });

  const handleSubmit = (values: EventFormInput) => {
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data: values });
      return;
    }

    createMutation.mutate({
      ...values,
      ...(prefillEvent ? { sourceEventId: prefillEvent.id } : {}),
    });
  };

  const openCreate = () => {
    setSelectedEvent(null);
    setPrefillEvent(null);
    setFormOpen(true);
  };

  const openEditor = (event: EventRecord) => {
    if (!canWrite) {
      return;
    }

    setDetailEvent(null);
    setPrefillEvent(null);
    setSelectedEvent(event);
    setFormOpen(true);
  };

  const openReuse = (event: EventRecord) => {
    if (!canWrite) {
      return;
    }

    setDetailEvent(null);
    setSelectedEvent(null);
    setPrefillEvent(event);
    setFormOpen(true);
  };

  const eventActions = (event: EventRecord) =>
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
          sideOffset={8}
          className="min-w-56 rounded-xl p-1.5 shadow-xl"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          {scope === "archived" ? (
            <>
              <DropdownMenuItem
                className="py-2"
                onClick={() => openEditor(event)}
              >
                <ArchiveRestoreIcon />
                {t("restore")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="py-2"
                onClick={() => openReuse(event)}
              >
                <CopyIcon />
                {t("reuse")}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              className="py-2"
              onClick={() => openEditor(event)}
            >
              <PencilIcon />
              {tCommon("actions.edit")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-2">
              <TagsIcon />
              {t("changeType")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 min-w-48 overflow-y-auto rounded-xl p-1.5 shadow-xl">
              <DropdownMenuRadioGroup
                value={event.typeId}
                onValueChange={(typeId) => {
                  if (typeId === event.typeId || changeTypeMutation.isPending) {
                    return;
                  }

                  changeTypeMutation.mutate({ id: event.id, typeId });
                }}
              >
                {types.map((type) => (
                  <DropdownMenuRadioItem
                    key={type.id}
                    value={type.id}
                    className="cursor-pointer py-2"
                    disabled={changeTypeMutation.isPending}
                  >
                    {eventTypeShareLine(type.emoji, type.label)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-2">
              <Share2Icon />
              {t("share")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-48 rounded-xl p-1.5 shadow-xl">
              <EventShareMenuItems events={[event]} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="py-2"
            onClick={() => setDeleteTarget(event)}
          >
            <Trash2Icon />
            {tCommon("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("share")}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <Share2Icon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-48 rounded-xl p-1.5 shadow-xl"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          <EventShareMenuItems events={[event]} />
        </DropdownMenuContent>
      </DropdownMenu>
    );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: dragged, over } = event;
    setActiveDragId(null);

    if (!over || dragged.id === over.id) {
      return;
    }

    const oldIndex = visibleEvents.findIndex((item) => item.id === dragged.id);
    const newIndex = visibleEvents.findIndex((item) => item.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextIds = arrayMove(visibleEvents, oldIndex, newIndex).map(
      (item) => item.id,
    );
    const previous = utils.events.listAll.getData();

    void utils.events.listAll.cancel();

    if (previous) {
      utils.events.listAll.setData(
        undefined,
        applyActiveEventOrder(nextIds, previous),
      );
    }

    reorderMutation.mutate(
      { orderedIds: nextIds },
      {
        onError: () => {
          if (previous) {
            utils.events.listAll.setData(undefined, previous);
          }
        },
      },
    );
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const activeDragEvent = visibleEvents.find(
    (event) => event.id === activeDragId,
  );

  const emptyMessage =
    events.length === 0
      ? t("adminEmpty")
      : visibleEvents.length === 0
        ? hasListFilters
          ? t("adminEmptyFiltered")
          : scope === "archived"
            ? t("adminEmptyArchived")
            : t("adminEmptyActive")
        : null;

  const renderGrid = (items: EventRecord[]) => {
    if (canDrag) {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {items.map((event) => (
                <EventSortableItem
                  key={event.id}
                  event={event}
                  shake
                  showVisibility
                  onEdit={canWrite ? () => openEditor(event) : undefined}
                  actions={eventActions(event)}
                  enableSocial
                  canModerateSocial={canManageTypes}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeDragEvent ? (
              <div className="pointer-events-none cursor-grabbing">
                <EventCard event={activeDragEvent} showVisibility enableSocial canModerateSocial={canManageTypes} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      );
    }

    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {items.map((event) => (
          <div key={event.id} className="h-full">
            <EventCard
              event={event}
              showVisibility
              shake={scope === "active" && event.important}
              onEdit={canWrite ? () => openEditor(event) : undefined}
              actions={eventActions(event)}
              enableSocial
              canModerateSocial={canManageTypes}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderTable = (items: EventRecord[]) => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>{t("columns.title")}</TableHead>
            <TableHead>{t("columns.type")}</TableHead>
            <TableHead>{t("columns.art")}</TableHead>
            <TableHead>{t("columns.startsAt")}</TableHead>
            <TableHead>{t("columns.status")}</TableHead>
            <TableHead className="w-0">{t("columns.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((event, index) => {
            const color = resolveEventColor(event);

            return (
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
                <TableCell>
                  <span
                    className={cn(
                      "inline-block size-2.5 rounded-full",
                      EVENT_COLOR_STYLES[color].dot,
                    )}
                    title={t(`colors.${color}`)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {event.title}
                    {event.important ? (
                      <span
                        title={t("important")}
                        className="inline-flex size-5 items-center justify-center rounded-full bg-orange-400 text-black"
                      >
                        <StarIcon className="size-3 fill-current" />
                        <span className="sr-only">{t("important")}</span>
                      </span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell>
                  <EventTypeBadge
                    label={event.type.label}
                    emoji={event.type.emoji}
                    color={color}
                  />
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
                  <div
                    className="flex items-center gap-1"
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                  >
                    {eventActions(event)}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("adminTitle")}
        </h1>
        <p className="sr-only">{t("adminSubtitle", { hint: t("orderHint") })}</p>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {events.length > 0 ? (
            <AdminViewModeToggle
              value={viewMode}
              onChange={(mode) => {
                void setViewMode(mode);
              }}
            />
          ) : null}
          {scope === "active" && visibleEvents.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={t("share")}
                >
                  <Share2Icon />
                  <span className="hidden sm:inline">{t("share")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-52 rounded-xl p-1.5 shadow-xl"
              >
                <EventShareMenuItems events={visibleEvents} />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {canManageTypes ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t("typesAdmin.manage")}
              onClick={() => setTypesOpen(true)}
            >
              <TagsIcon />
              <span className="hidden sm:inline">{t("typesAdmin.manage")}</span>
            </Button>
          ) : null}
          {canWrite ? (
            <Button size="sm" onClick={openCreate}>
              <PlusIcon />
              {t("new")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={scope === "active" ? "default" : "outline"}
            onClick={() => setScope("active")}
          >
            {t("scopeActive")}
            <Badge variant={scope === "active" ? "secondary" : "outline"}>
              {active.length}
            </Badge>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scope === "archived" ? "default" : "outline"}
            onClick={() => setScope("archived")}
          >
            {t("scopeArchived")}
            <Badge variant={scope === "archived" ? "secondary" : "outline"}>
              {archived.length}
            </Badge>
          </Button>
        </div>

        <EventAdminFiltersBar
          filters={filters}
          types={types}
          hasListFilters={hasListFilters}
          onReset={resetFilters}
          onChange={(patch) => {
            void setFilters(patch);
          }}
        />
      </div>

      {canDrag ? (
        <p className="text-[11px] leading-none text-muted-foreground">
          {t("filters.dndHint")}
        </p>
      ) : null}

      {emptyMessage ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      ) : scope === "archived" && viewMode === "grid" ? (
        <div className="flex flex-col gap-8">
          {archivedGroups.map((group) => (
            <section key={group.key} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium capitalize text-muted-foreground">
                {group.label}
              </h2>
              {renderGrid(group.events)}
            </section>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        renderGrid(visibleEvents)
      ) : scope === "archived" ? (
        <div className="flex flex-col gap-8">
          {archivedGroups.map((group) => (
            <section key={group.key} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium capitalize text-muted-foreground">
                {group.label}
              </h2>
              {renderTable(group.events)}
            </section>
          ))}
        </div>
      ) : (
        renderTable(visibleEvents)
      )}

      {detailEvent ? (
        <EventDetailDialog
          event={detailEvent}
          open
          onOpenChange={(open) => !open && setDetailEvent(null)}
          showVisibility
          enableSocial
          canModerateSocial={canManageTypes}
          onEdit={canWrite ? () => openEditor(detailEvent) : undefined}
        />
      ) : null}

      <EventFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setSelectedEvent(null);
            setPrefillEvent(null);
          }
        }}
        event={selectedEvent}
        prefill={prefillEvent}
        types={types}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      {canManageTypes ? (
        <EventTypesDialog
          open={typesOpen}
          onOpenChange={setTypesOpen}
          types={types}
        />
      ) : null}

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
