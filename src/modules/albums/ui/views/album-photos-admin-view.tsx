"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightLeftIcon,
  ClipboardPasteIcon,
  FolderPlusIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
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
import {
  ClipboardImageError,
  imageFileFromClipboardItems,
  readImageFileFromClipboard,
} from "@/lib/clipboard-image";
import { IMAGE_FILE_ACCEPT, normalizeImageContentType } from "@/lib/image-file";
import {
  ImagePrepareError,
  prepareImageFile,
} from "@/lib/prepare-image-file";
import { uploadFileToSignedUrl } from "@/lib/upload-to-signed-url";
import { useToastError } from "@/lib/use-toast-error";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { AlbumFormInput } from "@/modules/albums/schema";
import type { PhotoRecord } from "@/modules/albums/types";
import { AlbumCover } from "@/modules/albums/ui/components/album-cover";
import { AlbumFormDialog } from "@/modules/albums/ui/components/album-form-dialog";
import { AlbumsAdminBreadcrumb } from "@/modules/albums/ui/components/albums-admin-breadcrumb";
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
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [album] = trpc.albums.getById.useSuspenseQuery({ id: albumId });
  const [deleteTarget, setDeleteTarget] = useState<PhotoRecord | null>(null);
  const [moveTarget, setMoveTarget] = useState<PhotoRecord | null>(null);
  const [editTarget, setEditTarget] = useState<PhotoRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [destinationAlbumId, setDestinationAlbumId] = useState("");
  const [childFormOpen, setChildFormOpen] = useState(false);
  const [editAlbumOpen, setEditAlbumOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoQueryId, setPhotoQueryId] = useQueryState(
    "photo",
    parseAsString.withOptions({ history: "replace" }),
  );
  const [queue, setQueue] = useState<
    { id: string; file: File; preview: string; title: string; caption: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const addPhotoMutation = trpc.albums.addPhoto.useMutation({
    onError: toastError,
  });

  const createPhotoUploadMutation = trpc.albums.createPhotoUpload.useMutation({
    onError: toastError,
  });

  const removePhotoMutation = trpc.albums.removePhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto removida.");
      setDeleteTarget(null);
      utils.albums.getById.invalidate({ id: albumId });
    },
    onError: toastError,
  });

  const albumsQuery = trpc.albums.listAll.useQuery(undefined, {
    enabled: !!moveTarget,
  });

  const destinationAlbums = (albumsQuery.data ?? []).filter(
    (item) => item.id !== albumId,
  );

  const albumOptionLabel = (item: (typeof destinationAlbums)[number]) => {
    if (!item.parentId) {
      return item.title;
    }

    const parent = albumsQuery.data?.find((albumItem) => albumItem.id === item.parentId);
    return parent ? `${parent.title} › ${item.title}` : item.title;
  };

  const movePhotoMutation = trpc.albums.movePhoto.useMutation({
    onSuccess: () => {
      toast.success(t("moved"));
      setMoveTarget(null);
      setDestinationAlbumId("");
      void setPhotoQueryId(null);
      utils.albums.getById.invalidate({ id: albumId });
    },
    onError: toastError,
  });

  const setCoverMutation = trpc.albums.setCover.useMutation({
    onSuccess: () => {
      toast.success(t("coverSet"));
      utils.albums.getById.invalidate({ id: albumId });
      utils.albums.listAll.invalidate();
      utils.albums.listPublished.invalidate();
    },
    onError: toastError,
  });

  const clearCoverMutation = trpc.albums.clearCover.useMutation({
    onSuccess: () => {
      toast.success(t("coverRemoved"));
      utils.albums.getById.invalidate({ id: albumId });
      utils.albums.listAll.invalidate();
      utils.albums.listPublished.invalidate();
    },
    onError: toastError,
  });

  const updatePhotoMutation = trpc.albums.updatePhoto.useMutation({
    onSuccess: () => {
      toast.success(t("photoUpdated"));
      setEditTarget(null);
      utils.albums.getById.invalidate({ id: albumId });
    },
    onError: toastError,
  });

  const createChildMutation = trpc.albums.create.useMutation({
    onSuccess: () => {
      toast.success(t("childCreated"));
      setChildFormOpen(false);
      utils.albums.getById.invalidate({ id: albumId });
      utils.albums.listAll.invalidate();
      utils.albums.listRoots.invalidate();
    },
    onError: toastError,
  });

  const updateAlbumMutation = trpc.albums.update.useMutation({
    onSuccess: () => {
      toast.success(t("updated"));
      setEditAlbumOpen(false);
      utils.albums.getById.invalidate({ id: albumId });
      utils.albums.listAll.invalidate();
      utils.albums.listPublished.invalidate();
      utils.albums.listRoots.invalidate();
    },
    onError: toastError,
  });

  const handleCreateChild = (values: AlbumFormInput) => {
    createChildMutation.mutate({ ...values, parentId: albumId });
  };

  const handleUpdateAlbum = (values: AlbumFormInput) => {
    updateAlbumMutation.mutate({ id: albumId, data: values });
  };

  const isRootAlbum = !album.parentId;

  const enqueueFiles = async (files: File[]) => {
    const accepted: typeof queue = [];

    for (const file of files) {
      try {
        const prepared = await prepareImageFile(file);
        accepted.push({
          id: crypto.randomUUID(),
          file: prepared,
          preview: URL.createObjectURL(prepared),
          title: "",
          caption: "",
        });
      } catch (error) {
        toast.error(
          error instanceof ImagePrepareError
            ? tCommon(`errors.${error.code}`)
            : tCommon("errors.imageType"),
        );
      }
    }

    if (accepted.length === 0) {
      return;
    }

    setQueue((current) => [...current, ...accepted]);
  };

  const removeQueueItem = (id: string) => {
    setQueue((current) => {
      const target = current.find((entry) => entry.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return current.filter((entry) => entry.id !== id);
    });
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void enqueueFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const pastePhoto = (file: File) => enqueueFiles([file]);

  const confirmQueue = async () => {
    if (queue.length === 0) return;
    setIsUploading(true);
    try {
      for (const item of queue) {
        const contentType = normalizeImageContentType(item.file.type);
        if (!contentType) {
          throw new Error(tCommon("errors.imageType"));
        }

        const upload = await createPhotoUploadMutation.mutateAsync({
          albumId,
          contentType,
        });
        await uploadFileToSignedUrl(upload.signedUrl, item.file);
        await addPhotoMutation.mutateAsync({
          albumId,
          storagePath: upload.path,
          title: item.title || undefined,
          caption: item.caption || undefined,
        });
        URL.revokeObjectURL(item.preview);
        setQueue((current) => current.filter((entry) => entry.id !== item.id));
      }
      toast.success("Fotos enviadas com sucesso.");
      utils.albums.getById.invalidate({ id: albumId });
    } catch (error) {
      const isTrpcError =
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        "shape" in error;

      if (!isTrpcError) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível enviar as fotos.",
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!canWrite) {
      return;
    }

    const onPaste = (clipboardEvent: ClipboardEvent) => {
      const target = clipboardEvent.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

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

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

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

  const busy =
    isUploading ||
    addPhotoMutation.isPending ||
    createPhotoUploadMutation.isPending;
  const photoIndex = photoQueryId
    ? album.photos.findIndex((photo) => photo.id === photoQueryId)
    : -1;
  const activeIndex = photoIndex >= 0 ? photoIndex : null;
  const activePhoto =
    activeIndex !== null ? album.photos[activeIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      <AlbumsAdminBreadcrumb album={album} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
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
            accept={IMAGE_FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => handleFilesSelected(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditAlbumOpen(true)}
          >
            <PencilIcon />
            {t("edit")}
          </Button>
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
          {isRootAlbum ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setChildFormOpen(true)}
            >
              <FolderPlusIcon />
              {t("newChild")}
            </Button>
          ) : null}
        </div>
        ) : null}
      </div>

      {isRootAlbum ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("childrenTitle")}
          </h2>
          {album.children.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("childrenEmpty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {album.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/admin/albums/${child.id}`}
                  className="group flex overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
                >
                  <AlbumCover
                    src={child.coverImageUrl}
                    hideCover={child.hideCover}
                    alt={child.title}
                    className="size-20 shrink-0"
                    sizes="80px"
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3">
                    <p className="truncate font-medium">{child.title}</p>
                    <Badge
                      variant={child.published ? "default" : "secondary"}
                      className="w-fit"
                    >
                      {child.published ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

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
                    onClick={() => removeQueueItem(item.id)}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {album.photos.map((photo) => (
            <div
              key={photo.id}
              className="flex flex-col overflow-hidden rounded-lg border bg-card"
            >
              <div className="group relative aspect-square overflow-hidden bg-muted">
                <button
                  type="button"
                  className="absolute inset-0"
                  onClick={() => {
                    void setPhotoQueryId(photo.id);
                  }}
                  aria-label={photo.title ?? photo.caption ?? album.title}
                >
                  <Image
                    src={photo.imageUrl}
                    alt={photo.caption ?? album.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </button>
                {canWrite ? (
                  <div
                    className="absolute right-2 top-2 z-10"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={t("photoActions")}
                        className="flex size-8 items-center justify-center rounded-full bg-black/70 text-white outline-none hover:bg-black/85 focus-visible:ring-2 focus-visible:ring-orange-400"
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditTarget(photo);
                            setEditTitle(photo.title ?? "");
                            setEditCaption(photo.caption ?? "");
                          }}
                        >
                          <PencilIcon />
                          {tCommon("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setMoveTarget(photo)}>
                          <ArrowRightLeftIcon />
                          {t("move")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            setCoverMutation.isPending ||
                            album.coverImageUrl === photo.imageUrl
                          }
                          onClick={() =>
                            setCoverMutation.mutate({
                              albumId,
                              photoId: photo.id,
                            })
                          }
                        >
                          <StarIcon
                            className={
                              album.coverImageUrl === photo.imageUrl
                                ? "fill-orange-400 text-orange-400"
                                : undefined
                            }
                          />
                          {t("setCover")}
                        </DropdownMenuItem>
                        {album.coverImageUrl === photo.imageUrl ? (
                          <DropdownMenuItem
                            disabled={clearCoverMutation.isPending}
                            onClick={() =>
                              clearCoverMutation.mutate({ albumId })
                            }
                          >
                            <StarOffIcon />
                            {t("removeCover")}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(photo)}
                        >
                          <Trash2Icon />
                          {tCommon("actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
                {album.coverImageUrl === photo.imageUrl ? (
                  <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                    {t("cover")}
                  </span>
                ) : null}
              </div>
              <PhotoSocial
                photoId={photo.id}
                caption={photo.caption ?? photo.title}
                createdAt={photo.createdAt}
                canModerate={canModerate}
                variant="card"
              />
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

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editPhoto")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="photo-title">{t("photoTitle")}</Label>
              <Input
                id="photo-title"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="photo-caption">{t("photoCaption")}</Label>
              <Textarea
                id="photo-caption"
                value={editCaption}
                onChange={(event) => setEditCaption(event.target.value)}
                maxLength={2000}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget(null)}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!editTarget || updatePhotoMutation.isPending}
              onClick={() =>
                editTarget &&
                updatePhotoMutation.mutate({
                  id: editTarget.id,
                  title: editTitle,
                  caption: editCaption,
                })
              }
            >
              {updatePhotoMutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              {tCommon("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!moveTarget}
        onOpenChange={(open) => {
          if (!open) {
            setMoveTarget(null);
            setDestinationAlbumId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("moveTitle")}</DialogTitle>
            <DialogDescription>{t("moveTo")}</DialogDescription>
          </DialogHeader>
          {destinationAlbums.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("moveEmpty")}</p>
          ) : (
            <select
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              value={destinationAlbumId}
              onChange={(event) => setDestinationAlbumId(event.target.value)}
              aria-label={t("moveTo")}
            >
              <option value="">{t("moveTo")}</option>
              {destinationAlbums.map((item) => (
                <option key={item.id} value={item.id}>
                  {albumOptionLabel(item)}
                </option>
              ))}
            </select>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMoveTarget(null);
                setDestinationAlbumId("");
              }}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              type="button"
              disabled={
                !moveTarget ||
                !destinationAlbumId ||
                movePhotoMutation.isPending
              }
              onClick={() =>
                moveTarget &&
                movePhotoMutation.mutate({
                  id: moveTarget.id,
                  albumId: destinationAlbumId,
                })
              }
            >
              {movePhotoMutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              {t("move")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlbumFormDialog
        open={editAlbumOpen}
        onOpenChange={setEditAlbumOpen}
        album={album}
        title={t("edit")}
        isSubmitting={updateAlbumMutation.isPending}
        onSubmit={handleUpdateAlbum}
      />

      <AlbumFormDialog
        open={childFormOpen}
        onOpenChange={setChildFormOpen}
        defaultParentId={albumId}
        lockParent
        title={t("newChild")}
        description={t("newChildDescription", { title: album.title })}
        isSubmitting={createChildMutation.isPending}
        onSubmit={handleCreateChild}
      />

      <PhotoLightbox
        photos={album.photos}
        index={activeIndex}
        onIndexChange={(index) => {
          if (index === null) {
            void setPhotoQueryId(null);
            return;
          }

          void setPhotoQueryId(album.photos[index]?.id ?? null);
        }}
        footer={
          activePhoto ? (
            <PhotoSocial
              key={activePhoto.id}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
