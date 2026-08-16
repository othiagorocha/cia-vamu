"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventFormDialog } from "@/modules/events/ui/components/event-form-dialog";
import { EventTypeBadge } from "@/modules/events/ui/components/event-type-badge";
import type { EventFormInput } from "@/modules/events/schema";
import type { EventRecord } from "@/modules/events/types";
import { trpc } from "@/trpc/client";

export const EventsAdminView = ({ canWrite }: { canWrite: boolean }) => {
  const utils = trpc.useUtils();
  const [events] = trpc.events.listAll.useSuspenseQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);

  const invalidate = () => {
    utils.events.listAll.invalidate();
    utils.events.listUpcoming.invalidate();
  };

  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Evento criado com sucesso.");
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso.");
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const removeMutation = trpc.events.remove.useMutation({
    onSuccess: () => {
      toast.success("Evento removido.");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (values: EventFormInput) => {
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os eventos exibidos na agenda pública.
          </p>
        </div>
        {canWrite ? (
          <Button
            onClick={() => {
              setSelectedEvent(null);
              setFormOpen(true);
            }}
          >
            <PlusIcon />
            Novo evento
          </Button>
        ) : null}
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p>Nenhum evento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Arte</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow
                  key={event.id}
                  tabIndex={canWrite ? 0 : undefined}
                  className={canWrite ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (!canWrite) {
                      return;
                    }

                    setSelectedEvent(event);
                    setFormOpen(true);
                  }}
                  onKeyDown={(keyboardEvent) => {
                    if (!canWrite) {
                      return;
                    }

                    if (
                      keyboardEvent.key === "Enter" ||
                      keyboardEvent.key === " "
                    ) {
                      keyboardEvent.preventDefault();
                      setSelectedEvent(event);
                      setFormOpen(true);
                    }
                  }}
                >
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>
                    <EventTypeBadge type={event.type} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.imageUrl ? "outline" : "secondary"}>
                      {event.imageUrl ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(event.startsAt), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.published ? "default" : "secondary"}>
                      {event.published ? "Publicado" : "Rascunho"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setSelectedEvent(event);
                          setFormOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setDeleteTarget(event);
                        }}
                        aria-label="Excluir"
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
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
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O evento &quot;{deleteTarget?.title}
              &quot; será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && removeMutation.mutate({ id: deleteTarget.id })
              }
            >
              Excluir
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
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
};
