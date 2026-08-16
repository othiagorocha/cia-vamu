"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ClipboardPasteIcon,
  Loader2Icon,
  Trash2Icon,
  UploadIcon,
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
import { Button } from "@/components/ui/button";
import {
  ClipboardImageError,
  clipboardImageToDataUrl,
  imageFileFromClipboardItems,
  readImageFileFromClipboard,
} from "@/lib/clipboard-image";
import { fileToDataUrl } from "@/lib/file-to-data-url";
import { Input } from "@/components/ui/input";
import type { PhotoRecord } from "@/modules/albums/types";
import { PhotoLightbox } from "@/modules/albums/ui/components/photo-lightbox";
import { PhotoSocial } from "@/modules/albums/ui/components/photo-social";
import { trpc } from "@/trpc/client";

export const AlbumPhotosAdminView = ({
  albumId,
  canWrite,
  canModerate,
}: {
  albumId: string;
  canWrite: boolean;
  canModerate: boolean;
}) => {
  const t = useTranslations("albums");
  const utils = trpc.useUtils();
  const [album] = trpc.albums.getById.useSuspenseQuery({ id: albumId });
  const [deleteTarget, setDeleteTarget] = useState<PhotoRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [queue, setQueue] = useState<
    { id: string; preview: string; title: string; caption: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addPhotoMutation = trpc.albums.addPhoto.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const removePhotoMutation = trpc.albums.removePhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto removida.");
      setDeleteTarget(null);
      utils.albums.getById.invalidate({ id: albumId });
    },
    onError: (error) => toast.error(error.message),
  });

  const enqueueFiles = async (files: File[]) => {
    const items = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        preview: await fileToDataUrl(file),
        title: "",
        caption: "",
      })),
    );
    setQueue((current) => [...current, ...items]);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await enqueueFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const pastePhoto = async (file: File) => {
    try {
      const dataUrl = await clipboardImageToDataUrl(file);
      setQueue((current) => [
        ...current,
        { id: crypto.randomUUID(), preview: dataUrl, title: "", caption: "" },
      ]);
    } catch (error) {
      toast.error(
        error instanceof ClipboardImageError
          ? error.message
          : "Não foi possível colar a foto.",
      );
    }
  };

  const confirmQueue = async () => {
    if (queue.length === 0) return;
    setIsUploading(true);
    try {
      for (const item of queue) {
        await addPhotoMutation.mutateAsync({
          albumId,
          image: item.preview,
          title: item.title || undefined,
          caption: item.caption || undefined,
        });
      }
      toast.success("Fotos enviadas com sucesso.");
      setQueue([]);
      utils.albums.getById.invalidate({ id: albumId });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!canWrite) {
      return;
    }

    const onPaste = (clipboardEvent: ClipboardEvent) => {
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      const file = imageFileFromClipboardItems(items);
      if (!file) return;

      clipboardEvent.preventDefault();
      void pastePhoto(file);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  const handlePasteFromClipboard = async () => {
    try {
      const file = await readImageFileFromClipboard();
      await pastePhoto(file);
    } catch (error) {
      toast.error(
        error instanceof ClipboardImageError
          ? error.message
          : "Não foi possível colar a foto.",
      );
    }
  };

  const busy = isUploading || addPhotoMutation.isPending;
  const activePhoto =
    activeIndex !== null ? album.photos[activeIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link href="/admin/albums">
              <ArrowLeftIcon />
              Voltar para álbuns
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{album.title}</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as fotos deste álbum. Use Ctrl+V para colar.
          </p>
        </div>
        {canWrite ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => handleFilesSelected(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={handlePasteFromClipboard}
          >
            <ClipboardPasteIcon />
            Colar foto
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {isUploading ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            Adicionar à fila
          </Button>
        </div>
        ) : null}
      </div>

      {canWrite && queue.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <p className="font-medium">{t("queueTitle")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {queue.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-lg border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt=""
                  className="size-20 rounded object-cover"
                />
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    placeholder={t("photoTitle")}
                    value={item.title}
                    onChange={(event) =>
                      setQueue((current) =>
                        current.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, title: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                  <Input
                    placeholder={t("photoCaption")}
                    value={item.caption}
                    onChange={(event) =>
                      setQueue((current) =>
                        current.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, caption: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setQueue((current) =>
                        current.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={confirmQueue} disabled={busy}>
            {t("queueConfirm")}
          </Button>
        </div>
      ) : null}

      {album.photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p>Nenhuma foto neste álbum ainda.</p>
          <p className="text-xs">Envie arquivos ou cole com Ctrl+V / Cmd+V.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {album.photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <button
                type="button"
                className="absolute inset-0"
                onClick={() => setActiveIndex(index)}
                aria-label={photo.title ?? photo.caption ?? album.title}
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.caption ?? album.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                />
              </button>
              {canWrite ? (
              <Button
                variant="destructive"
                size="icon-sm"
                className="absolute right-2 top-2 z-10"
                onClick={() => setDeleteTarget(photo)}
                aria-label="Excluir foto"
              >
                <Trash2Icon className="size-4" />
              </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && removePhotoMutation.mutate({ id: deleteTarget.id })
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PhotoLightbox
        photos={album.photos}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        footer={
          activePhoto ? (
            <PhotoSocial
              photoId={activePhoto.id}
              caption={activePhoto.caption ?? activePhoto.title}
              createdAt={activePhoto.createdAt}
              canModerate={canModerate}
            />
          ) : null
        }
      />
    </div>
  );
};

export const AlbumPhotosAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
