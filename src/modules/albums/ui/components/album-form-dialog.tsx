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
import { Textarea } from "@/components/ui/textarea";
import { fileToDataUrl } from "@/lib/file-to-data-url";
import { albumFormSchema, type AlbumFormInput } from "@/modules/albums/schema";
import type { AlbumRecord } from "@/modules/albums/types";

type AlbumFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  album?: AlbumRecord | null;
  isSubmitting?: boolean;
  onSubmit: (values: AlbumFormInput) => void;
};

export const AlbumFormDialog = ({
  open,
  onOpenChange,
  album,
  isSubmitting,
  onSubmit,
}: AlbumFormDialogProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  const form = useForm<AlbumFormInput>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: {
      title: "",
      description: "",
      published: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: album?.title ?? "",
        description: album?.description ?? "",
        published: album?.published ?? false,
        coverImage: undefined,
      });
      setPreview(album?.coverImageUrl ?? null);
    }
  }, [open, album, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{album ? "Editar álbum" : "Novo álbum"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do álbum de fotos.
          </DialogDescription>
        </DialogHeader>

        <form
          id="album-form"
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
                  <FieldLabel htmlFor="album-title">Título</FieldLabel>
                  <Input {...field} id="album-title" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="album-description">Descrição</FieldLabel>
                  <Textarea {...field} id="album-description" rows={3} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="coverImage"
              render={({ field: { onChange, ...field } }) => (
                <Field>
                  <FieldLabel htmlFor="album-cover">Capa</FieldLabel>
                  <div className="flex items-center gap-3">
                    <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {preview ? (
                        <Image src={preview} alt="" fill className="object-cover" />
                      ) : (
                        <ImageIcon className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <Input
                      {...field}
                      id="album-cover"
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

            <Controller
              control={form.control}
              name="published"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <input
                    id="album-published"
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                  <FieldLabel htmlFor="album-published" className="font-normal">
                    Publicar na galeria pública
                  </FieldLabel>
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="album-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
