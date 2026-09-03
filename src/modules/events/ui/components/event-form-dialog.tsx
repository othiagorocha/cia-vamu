"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPasteIcon, ImageIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardImageError,
  clipboardImageToDataUrl,
  imageFileFromClipboardItems,
  readImageFileFromClipboard,
} from "@/lib/clipboard-image";
import { fileToDataUrl } from "@/lib/file-to-data-url";
import { toBrazilDateTimeLocal } from "@/lib/brazil-datetime";
import { isEventColorId } from "@/modules/events/event-colors";
import { computeReuseEventDates } from "@/modules/events/event-status";
import { eventTypeShareLine } from "@/modules/events/event-types";
import { eventFormSchema, type EventFormInput } from "@/modules/events/schema";
import type { EventRecord, EventTypeRecord } from "@/modules/events/types";
import { EventColorPicker } from "@/modules/events/ui/components/event-color-picker";
import { EventLocationFields } from "@/modules/events/ui/components/event-location-fields";
import { isPlacesSuggestEvent } from "@/modules/events/ui/components/location-suggest-input";

type EventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventRecord | null;
  prefill?: EventRecord | null;
  initialStartsAt?: string | null;
  types: EventTypeRecord[];
  isSubmitting?: boolean;
  onSubmit: (values: EventFormInput) => void;
};

const defaultTypeId = (types: EventTypeRecord[]) =>
  types.find((type) => type.slug === "outro")?.id ?? types[0]?.id ?? "";

export const EventFormDialog = ({
  open,
  onOpenChange,
  event,
  prefill,
  initialStartsAt,
  types,
  isSubmitting,
  onSubmit,
}: EventFormDialogProps) => {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      typeId: defaultTypeId(types),
      startsAt: "",
      endsAt: "",
      location: "",
      locationMapsQuery: "",
      published: false,
      color: null,
      important: false,
      image: undefined,
      removeImage: false,
    },
  });

  const applyImageFile = async (file: File) => {
    try {
      const dataUrl = await clipboardImageToDataUrl(file);
      setPreview(dataUrl);
      form.setValue("image", dataUrl, { shouldValidate: true, shouldDirty: true });
      form.setValue("removeImage", false, { shouldDirty: true });
      toast.success("Arte colada da área de transferência.");
    } catch (error) {
      toast.error(
        error instanceof ClipboardImageError
          ? error.message
          : "Não foi possível colar a imagem.",
      );
    }
  };

  useEffect(() => {
    if (open) {
      const source = event ?? prefill;
      const isReuse = Boolean(prefill) && !event;
      const reuseDates =
        isReuse && source
          ? computeReuseEventDates(source)
          : null;

      form.reset({
        title: source?.title ?? "",
        description: source?.description ?? "",
        typeId: source?.typeId ?? defaultTypeId(types),
        startsAt: isReuse
          ? toBrazilDateTimeLocal(reuseDates?.startsAt)
          : toBrazilDateTimeLocal(event?.startsAt) || initialStartsAt || "",
        endsAt: isReuse
          ? toBrazilDateTimeLocal(reuseDates?.endsAt)
          : toBrazilDateTimeLocal(event?.endsAt),
        location: source?.location ?? "",
        locationMapsQuery: source?.locationMapsQuery ?? "",
        published: source?.published ?? false,
        color: source && isEventColorId(source.color) ? source.color : null,
        important: source?.important ?? false,
        image: undefined,
        removeImage: false,
      });
      setPreview(source?.imageUrl ?? null);
      setLocationOpen(
        Boolean(source?.location?.trim() || source?.locationMapsQuery?.trim()),
      );
    }
  }, [open, event, prefill, initialStartsAt, form, types]);

  useEffect(() => {
    if (!open) return;

    const onPaste = (clipboardEvent: ClipboardEvent) => {
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      const file = imageFileFromClipboardItems(items);
      if (!file) return;

      clipboardEvent.preventDefault();
      void applyImageFile(file);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  const handlePasteFromClipboard = async () => {
    setIsPasting(true);
    try {
      const file = await readImageFileFromClipboard();
      await applyImageFile(file);
    } catch (error) {
      toast.error(
        error instanceof ClipboardImageError
          ? error.message
          : "Não foi possível colar a imagem.",
      );
    } finally {
      setIsPasting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onPointerDownOutside={(event) => {
          if (isPlacesSuggestEvent(event)) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          if (isPlacesSuggestEvent(event)) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isPlacesSuggestEvent(event)) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {event
              ? t("form.editTitle")
              : prefill
                ? t("form.reuseTitle")
                : t("form.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("form.description")}</DialogDescription>
        </DialogHeader>

        <form
          id="event-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("form.sections.content")}
            </h3>
            <FieldGroup>
              <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="title">{t("form.title")}</FieldLabel>
                    <Input {...field} id="title" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="description"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="description">{t("form.body")}</FieldLabel>
                    <Textarea {...field} id="description" rows={3} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </section>

          <section className="space-y-3 border-t border-foreground/10 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("form.sections.art")}
            </h3>
            <FieldGroup>
              <Controller
                control={form.control}
                name="image"
                render={({ field: { onChange, ...field } }) => (
                  <Field>
                    <FieldLabel htmlFor="event-image">{t("form.image")}</FieldLabel>
                    <div className="flex items-start gap-3">
                      <div className="relative flex aspect-3/4 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                        {preview ? (
                          <Image src={preview} alt="" fill className="object-cover" />
                        ) : (
                          <ImageIcon className="size-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Input
                          {...field}
                          ref={fileInputRef}
                          id="event-image"
                          type="file"
                          accept="image/*"
                          value={undefined}
                          onChange={async (inputEvent) => {
                            const file = inputEvent.target.files?.[0];
                            if (!file) return;
                            const dataUrl = await fileToDataUrl(file);
                            setPreview(dataUrl);
                            onChange(dataUrl);
                            form.setValue("removeImage", false, {
                              shouldDirty: true,
                            });
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPasting}
                            onClick={handlePasteFromClipboard}
                          >
                            {isPasting ? (
                              <Loader2Icon className="animate-spin" />
                            ) : (
                              <ClipboardPasteIcon />
                            )}
                            {t("form.pasteImage")}
                          </Button>
                          {preview ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPreview(null);
                                onChange(undefined);
                                form.setValue("removeImage", true, {
                                  shouldDirty: true,
                                });
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                            >
                              {t("removeImage")}
                            </Button>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {t("form.pasteHint")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Field>
                )}
              />
            </FieldGroup>
          </section>

          <section className="space-y-3 border-t border-foreground/10 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("form.sections.details")}
            </h3>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="typeId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="type">{t("form.type")}</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {types.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {eventTypeShareLine(option.emoji, option.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />

                <EventLocationFields
                  control={form.control}
                  getValues={form.getValues}
                  setValue={form.setValue}
                  open={locationOpen}
                  onOpen={() => setLocationOpen(true)}
                />
              </div>

              <Controller
                control={form.control}
                name="color"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{t("form.color")}</FieldLabel>
                    <EventColorPicker
                      typeDefaultColor={
                        types.find((type) => type.id === form.watch("typeId"))
                          ?.defaultColor ?? "slate"
                      }
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="important"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <input
                      id="event-important"
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={field.value}
                      onChange={(inputEvent) =>
                        field.onChange(inputEvent.target.checked)
                      }
                    />
                    <FieldLabel htmlFor="event-important" className="font-normal">
                      <span className="flex flex-col gap-0.5">
                        <span>{t("form.important")}</span>
                        <span className="text-xs text-muted-foreground">
                          {t("importantHint")}
                        </span>
                      </span>
                    </FieldLabel>
                  </Field>
                )}
              />
            </FieldGroup>
          </section>

          <section className="space-y-3 border-t border-foreground/10 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("form.sections.when")}
            </h3>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="startsAt"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="startsAt">{t("form.startsAt")}</FieldLabel>
                      <Input
                        {...field}
                        id="startsAt"
                        type="datetime-local"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="endsAt"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="endsAt">{t("form.endsAt")}</FieldLabel>
                      <Input
                        {...field}
                        id="endsAt"
                        type="datetime-local"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </section>

          <section className="space-y-3 border-t border-foreground/10 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("form.sections.visibility")}
            </h3>
            <FieldGroup>
              <Controller
                control={form.control}
                name="published"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <Field orientation="horizontal">
                      <input
                        id="visibility-team"
                        type="radio"
                        name="event-visibility"
                        className="size-4 border-input"
                        checked={!field.value}
                        onChange={() => field.onChange(false)}
                      />
                      <FieldLabel htmlFor="visibility-team" className="font-normal">
                        <span className="flex flex-col gap-0.5">
                          <span>{t("visibility.team")}</span>
                          <span className="text-xs text-muted-foreground">
                            {t("visibility.teamHint")}
                          </span>
                        </span>
                      </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                      <input
                        id="visibility-public"
                        type="radio"
                        name="event-visibility"
                        className="size-4 border-input"
                        checked={field.value}
                        onChange={() => field.onChange(true)}
                      />
                      <FieldLabel htmlFor="visibility-public" className="font-normal">
                        <span className="flex flex-col gap-0.5">
                          <span>{t("visibility.public")}</span>
                          <span className="text-xs text-muted-foreground">
                            {t("visibility.publicHint")}
                          </span>
                        </span>
                      </FieldLabel>
                    </Field>
                  </div>
                )}
              />
            </FieldGroup>
          </section>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            {tCommon("actions.cancel")}
          </Button>
          <Button type="submit" form="event-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {tCommon("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
