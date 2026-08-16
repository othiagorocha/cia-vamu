"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPasteIcon, ImageIcon, Loader2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardImageError,
  clipboardImageToDataUrl,
  imageFileFromClipboardItems,
  readImageFileFromClipboard,
} from "@/lib/clipboard-image";
import { fileToDataUrl } from "@/lib/file-to-data-url";
import { albumFormSchema, type AlbumFormInput } from "@/modules/albums/schema";
import type { AlbumRecord } from "@/modules/albums/types";
import { trpc } from "@/trpc/client";

type AlbumFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  album?: AlbumRecord | null;
  defaultParentId?: string;
  lockParent?: boolean;
  title?: string;
  description?: string;
  isSubmitting?: boolean;
  onSubmit: (values: AlbumFormInput) => void;
};

export const AlbumFormDialog = ({
  open,
  onOpenChange,
  album,
  defaultParentId,
  lockParent = false,
  title,
  description,
  isSubmitting,
  onSubmit,
}: AlbumFormDialogProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const rootsQuery = trpc.albums.listRoots.useQuery(undefined, {
    enabled: open && !lockParent,
  });

  const form = useForm<AlbumFormInput>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: {
      title: "",
      description: "",
      published: false,
      parentId: "",
    },
  });

  const applyCoverFile = async (file: File) => {
    try {
      const dataUrl = await clipboardImageToDataUrl(file);
      setPreview(dataUrl);
      form.setValue("coverImage", dataUrl, {
        shouldValidate: true,
        shouldDirty: true,
      });
      toast.success("Capa colada da área de transferência.");
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
        title: album?.title ?? "",
        description: album?.description ?? "",
        published: album?.published ?? false,
        parentId: album?.parentId ?? defaultParentId ?? "",
        coverImage: undefined,
      });
      setPreview(album?.coverImageUrl ?? null);
    }
  }, [open, album, defaultParentId, form]);

  useEffect(() => {
    if (!open) return;

    const onPaste = (clipboardEvent: ClipboardEvent) => {
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      const file = imageFileFromClipboardItems(items);
      if (!file) return;

      clipboardEvent.preventDefault();
      void applyCoverFile(file);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  const handlePasteFromClipboard = async () => {
    setIsPasting(true);
    try {
      const file = await readImageFileFromClipboard();
      await applyCoverFile(file);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {title ?? (album ? "Editar álbum" : "Novo álbum")}
          </DialogTitle>
          <DialogDescription>
            {description ??
              "Preencha os dados do álbum. Você pode anexar ou colar a capa."}
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
                  <Input
                    {...field}
                    id="album-title"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {!lockParent ? (
            <Controller
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="album-parent">Álbum pai</FieldLabel>
                  <select
                    id="album-parent"
                    className="h-9 rounded-lg border bg-background px-3 text-sm"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  >
                    <option value="">Nenhum (álbum principal)</option>
                    {(rootsQuery.data ?? [])
                      .filter((root) => root.id !== album?.id)
                      .map((root) => (
                        <option key={root.id} value={root.id}>
                          {root.title}
                        </option>
                      ))}
                  </select>
                </Field>
              )}
            />
            ) : null}

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
                  <div className="flex items-start gap-3">
                    <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {preview ? (
                        <Image src={preview} alt="" fill className="object-cover" />
                      ) : (
                        <ImageIcon className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Input
                        {...field}
                        id="album-cover"
                        type="file"
                        accept="image/*"
                        value={undefined}
                        onChange={async (inputEvent) => {
                          const file = inputEvent.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await fileToDataUrl(file);
                          setPreview(dataUrl);
                          onChange(dataUrl);
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
                          Colar imagem
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          ou Ctrl+V / Cmd+V com o diálogo aberto
                        </span>
                      </div>
                    </div>
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
                    onChange={(inputEvent) =>
                      field.onChange(inputEvent.target.checked)
                    }
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
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
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
