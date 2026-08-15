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
import type { PhotoRecord } from "@/modules/albums/types";
import { trpc } from "@/trpc/client";

export const AlbumPhotosAdminView = ({ albumId }: { albumId: string }) => {
  const utils = trpc.useUtils();
  const [album] = trpc.albums.getById.useSuspenseQuery({ id: albumId });
  const [deleteTarget, setDeleteTarget] = useState<PhotoRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
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

  const uploadImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        await addPhotoMutation.mutateAsync({ albumId, image: dataUrl });
      }
      toast.success(
        files.length === 1
          ? "Foto enviada com sucesso."
          : "Fotos enviadas com sucesso.",
      );
      utils.albums.getById.invalidate({ id: albumId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await uploadImageFiles(Array.from(files));
  };

  const pastePhoto = async (file: File) => {
    try {
      const dataUrl = await clipboardImageToDataUrl(file);
      setIsUploading(true);
      await addPhotoMutation.mutateAsync({ albumId, image: dataUrl });
      toast.success("Foto colada da área de transferência.");
      utils.albums.getById.invalidate({ id: albumId });
    } catch (error) {
      toast.error(
        error instanceof ClipboardImageError
          ? error.message
          : "Não foi possível colar a foto.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
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
    setIsPasting(true);
    try {
      const file = await readImageFileFromClipboard();
      await pastePhoto(file);
    } catch (error) {
      toast.error(
        error instanceof ClipboardImageError
          ? error.message
          : "Não foi possível colar a foto.",
      );
    } finally {
      setIsPasting(false);
    }
  };

  const busy = isUploading || isPasting || addPhotoMutation.isPending;

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
            {isPasting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <ClipboardPasteIcon />
            )}
            Colar foto
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {isUploading && !isPasting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            Enviar fotos
          </Button>
        </div>
      </div>

      {album.photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p>Nenhuma foto neste álbum ainda.</p>
          <p className="text-xs">Envie arquivos ou cole com Ctrl+V / Cmd+V.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {album.photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <Image
                src={photo.imageUrl}
                alt={photo.caption ?? album.title}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
              <Button
                variant="destructive"
                size="icon-sm"
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => setDeleteTarget(photo)}
                aria-label="Excluir foto"
              >
                <Trash2Icon className="size-4" />
              </Button>
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
