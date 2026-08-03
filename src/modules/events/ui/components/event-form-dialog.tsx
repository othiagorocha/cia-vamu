"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Loader2Icon } from "lucide-react";

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
import { fileToDataUrl } from "@/lib/file-to-data-url";
import { eventFormSchema, type EventFormInput } from "@/modules/events/schema";
import type { EventRecord } from "@/modules/events/types";

const EVENT_TYPE_OPTIONS: { value: EventFormInput["type"]; label: string }[] = [
  { value: "teatro", label: "Teatro" },
  { value: "viagem", label: "Viagem" },
  { value: "evangelismo", label: "Evangelismo" },
  { value: "outro", label: "Outro" },
];

function toDateTimeLocal(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

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
  const [preview, setPreview] = useState<string | null>(null);

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
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: event?.title ?? "",
        description: event?.description ?? "",
        type: event?.type ?? "outro",
        startsAt: toDateTimeLocal(event?.startsAt),
        endsAt: toDateTimeLocal(event?.endsAt),
        location: event?.location ?? "",
        published: event?.published ?? false,
        image: undefined,
      });
      setPreview(event?.imageUrl ?? null);
    }
  }, [open, event, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do evento. Você pode anexar uma arte/flyer.
          </DialogDescription>
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
                  <FieldLabel htmlFor="title">Título</FieldLabel>
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
                  <FieldLabel htmlFor="description">Descrição</FieldLabel>
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
                  <FieldLabel htmlFor="event-image">Arte / flyer (opcional)</FieldLabel>
                  <div className="flex items-start gap-3">
                    <div className="relative flex aspect-3/4 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {preview ? (
                        <Image src={preview} alt="" fill className="object-cover" />
                      ) : (
                        <ImageIcon className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <Input
                      {...field}
                      id="event-image"
                      type="file"
                      accept="image/*"
                      value={undefined}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await fileToDataUrl(file);
                        setPreview(dataUrl);
                        onChange(dataUrl);
                      }}
                    />
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
                    <FieldLabel htmlFor="type">Tipo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                    <FieldLabel htmlFor="location">Local</FieldLabel>
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
                    <FieldLabel htmlFor="startsAt">Início</FieldLabel>
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
                    <FieldLabel htmlFor="endsAt">Término (opcional)</FieldLabel>
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
                <Field orientation="horizontal">
                  <input
                    id="published"
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                  <FieldLabel htmlFor="published" className="font-normal">
                    Publicar na agenda pública
                  </FieldLabel>
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="event-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
