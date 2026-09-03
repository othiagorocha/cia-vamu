"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToastError } from "@/lib/use-toast-error";
import {
  EVENT_COLOR_IDS,
  EVENT_COLOR_STYLES,
  FALLBACK_EVENT_COLOR,
  isEventColorId,
} from "@/modules/events/event-colors";
import {
  DEFAULT_EVENT_TYPE_EMOJI,
  EVENT_TYPE_EMOJI_SUGGESTIONS,
  eventTypeShareLine,
  lastEventTypeGrapheme,
} from "@/modules/events/event-types";
import {
  eventTypeFormSchema,
  type EventTypeFormInput,
} from "@/modules/events/schema";
import type { EventTypeRecord } from "@/modules/events/types";
import { trpc } from "@/trpc/client";

type EventTypesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: EventTypeRecord[];
};

export const EventTypesDialog = ({
  open,
  onOpenChange,
  types,
}: EventTypesDialogProps) => {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<EventTypeRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventTypeRecord | null>(null);

  const invalidate = () => {
    void utils.eventTypes.list.invalidate();
    void utils.events.listAll.invalidate();
    void utils.events.listUpcoming.invalidate();
  };

  const createMutation = trpc.eventTypes.create.useMutation({
    onSuccess: () => {
      toast.success(t("typesAdmin.created"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const updateMutation = trpc.eventTypes.update.useMutation({
    onSuccess: () => {
      toast.success(t("typesAdmin.updated"));
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: toastError,
  });

  const removeMutation = trpc.eventTypes.remove.useMutation({
    onSuccess: () => {
      toast.success(t("typesAdmin.removed"));
      setDeleteTarget(null);
      invalidate();
    },
    onError: toastError,
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (type: EventTypeRecord) => {
    setEditing(type);
    setFormOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("typesAdmin.title")}</DialogTitle>
            <DialogDescription>{t("typesAdmin.description")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {types.map((type) => {
              const color = isEventColorId(type.defaultColor)
                ? type.defaultColor
                : FALLBACK_EVENT_COLOR;

              return (
                <div
                  key={type.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <span
                    className={cn(
                      "size-3.5 shrink-0 rounded-full",
                      EVENT_COLOR_STYLES[color].swatch,
                    )}
                    title={t(`colors.${color}`)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {eventTypeShareLine(type.emoji, type.label)}
                    </p>
                    {type.isSystem ? (
                      <p className="text-xs text-muted-foreground">
                        {t("typesAdmin.system")}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={tCommon("actions.edit")}
                    onClick={() => openEdit(type)}
                  >
                    <PencilIcon />
                  </Button>
                  {type.isSystem ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={tCommon("actions.delete")}
                      onClick={() => setDeleteTarget(type)}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={openCreate}>
              <PlusIcon />
              {t("typesAdmin.new")}
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              {tCommon("actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventTypeFormDialog
        open={formOpen}
        type={editing}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) {
            setEditing(null);
          }
        }}
        onSubmit={(values) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, data: values });
            return;
          }

          createMutation.mutate(values);
        }}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("typesAdmin.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("typesAdmin.deleteDescription", {
                label: deleteTarget?.label ?? "",
              })}
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
    </>
  );
};

type EventTypeFormDialogProps = {
  open: boolean;
  type: EventTypeRecord | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EventTypeFormInput) => void;
};

const EventTypeFormDialog = ({
  open,
  type,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: EventTypeFormDialogProps) => {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");

  const form = useForm<EventTypeFormInput>({
    resolver: zodResolver(eventTypeFormSchema),
    defaultValues: {
      label: "",
      emoji: DEFAULT_EVENT_TYPE_EMOJI,
      defaultColor: "emerald",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      label: type?.label ?? "",
      emoji: type?.emoji?.trim() || DEFAULT_EVENT_TYPE_EMOJI,
      defaultColor: isEventColorId(type?.defaultColor)
        ? type.defaultColor
        : "emerald",
    });
  }, [open, type, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type ? t("typesAdmin.editTitle") : t("typesAdmin.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("typesAdmin.formDescription")}</DialogDescription>
        </DialogHeader>

        <form
          id="event-type-form"
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Controller
              control={form.control}
              name="label"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="event-type-label">
                    {t("typesAdmin.label")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="event-type-label"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="emoji"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="event-type-emoji">
                    {t("typesAdmin.emoji")}
                  </FieldLabel>
                  <div className="flex flex-col gap-3">
                    <Input
                      {...field}
                      id="event-type-emoji"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      inputMode="text"
                      className="h-12 w-16 shrink-0 text-center text-2xl leading-none"
                      value={field.value ?? ""}
                      onChange={(changeEvent) => {
                        const next = lastEventTypeGrapheme(
                          changeEvent.target.value,
                        );
                        field.onChange(next);
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {EVENT_TYPE_EMOJI_SUGGESTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => field.onChange(emoji)}
                          aria-pressed={field.value === emoji}
                          aria-label={emoji}
                          className={cn(
                            "flex size-11 items-center justify-center rounded-lg border text-xl transition-colors",
                            field.value === emoji
                              ? "border-foreground/50 ring-2 ring-foreground/20"
                              : "border-border hover:bg-muted/60",
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <FieldDescription>{t("typesAdmin.emojiHint")}</FieldDescription>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="defaultColor"
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("typesAdmin.defaultColor")}</FieldLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    {EVENT_COLOR_IDS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        aria-pressed={field.value === color}
                        aria-label={t(`colors.${color}`)}
                        title={t(`colors.${color}`)}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg border transition-colors",
                          field.value === color
                            ? "border-foreground/50 ring-2 ring-foreground/20"
                            : "border-border hover:bg-muted/60",
                        )}
                      >
                        <span
                          className={cn(
                            "size-4 rounded-full",
                            EVENT_COLOR_STYLES[color].swatch,
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button type="submit" form="event-type-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
            {tCommon("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
