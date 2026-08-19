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
import { eventFormSchema, type EventFormInput } from "@/modules/events/schema";
import type { EventRecord } from "@/modules/events/types";

const EVENT_TYPE_OPTIONS: EventFormInput["type"][] = [
  "teatro",
  "viagem",
  "evangelismo",
  "outro",
];

type EventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventRecord | null;
  isSubmitting?: boolean;
  onSubmit: (values: EventFormInput) => void;
};

export const EventFormDialog = ({
  open,
  onOpenChange,
  event,
  isSubmitting,
  onSubmit,
}: EventFormDialogProps) => {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);

  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "outro",
      startsAt: "",
      endsAt: "",
      location: "",
      published: false,
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
      form.reset({
        title: event?.title ?? "",
        description: event?.description ?? "",
        type: event?.type ?? "outro",
        startsAt: toBrazilDateTimeLocal(event?.startsAt),
        endsAt: toBrazilDateTimeLocal(event?.endsAt),
        location: event?.location ?? "",
        published: event?.published ?? false,
        image: undefined,
        removeImage: false,
      });
      setPreview(event?.imageUrl ?? null);
    }
  }, [open, event, form]);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {event ? t("form.editTitle") : t("form.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("form.description")}</DialogDescription>
        </DialogHeader>

        <form
          id="event-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
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

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="type">{t("form.type")}</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {t(`types.${option}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="location"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="location">{t("form.location")}</FieldLabel>
                    <Input {...field} id="location" />
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <Controller
              control={form.control}
              name="published"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Field orientation="horizontal">
                    <input
                      id="visibility-public"
                      type="checkbox"
                      className="size-4 rounded border-input"
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
                  <Field orientation="horizontal">
                    <input
                      id="visibility-team"
                      type="checkbox"
                      className="size-4 rounded border-input"
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
                </div>
              )}
            />
          </FieldGroup>
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
