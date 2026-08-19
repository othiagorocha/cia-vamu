"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { useAdminViewMode } from "@/lib/admin-view-mode";
import { useToastError } from "@/lib/use-toast-error";
import { AdminViewModeToggle } from "@/modules/dashboard/ui/components/admin-view-mode-toggle";
import { AlbumFormDialog } from "@/modules/albums/ui/components/album-form-dialog";
import type { AlbumFormInput } from "@/modules/albums/schema";
import type { AlbumRecord } from "@/modules/albums/types";
import { trpc } from "@/trpc/client";

export const AlbumsAdminView = ({ canWrite }: { canWrite: boolean }) => {
  const t = useTranslations("albums");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [albums] = trpc.albums.listAll.useSuspenseQuery();
  const [viewMode, setViewMode] = useAdminViewMode();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlbumRecord | null>(null);

  const invalidate = () => {
    utils.albums.listAll.invalidate();
    utils.albums.listPublished.invalidate();
  };

  const createMutation = trpc.albums.create.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const updateMutation = trpc.albums.update.useMutation({
    onSuccess: () => {
      toast.success(t("updated"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const removeMutation = trpc.albums.remove.useMutation({
    onSuccess: () => {
      toast.success(t("removed"));
      setDeleteTarget(null);
      invalidate();
    },
    onError: toastError,
  });

  const handleSubmit = (values: AlbumFormInput) => {
    if (selectedAlbum) {
      updateMutation.mutate({ id: selectedAlbum.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openAlbum = (album: AlbumRecord) => {
    router.push(`/admin/albums/${album.id}`);
  };

  const albumActions = (album: AlbumRecord) =>
    canWrite ? (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setSelectedAlbum(album);
            setFormOpen(true);
          }}
          aria-label={tCommon("actions.edit")}
        >
          <PencilIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDeleteTarget(album)}
          aria-label={tCommon("actions.delete")}
        >
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("adminTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("adminSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {albums.length > 0 ? (
            <AdminViewModeToggle
              value={viewMode}
              onChange={(mode) => {
                void setViewMode(mode);
              }}
            />
          ) : null}
          {canWrite ? (
            <Button
              onClick={() => {
                setSelectedAlbum(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon />
              {t("new")}
            </Button>
          ) : null}
        </div>
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p>{t("adminEmpty")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {albums.map((album) => (
            <article key={album.id} className="relative">
              <button
                type="button"
                onClick={() => openAlbum(album)}
                aria-label={t("openAlbum", { title: album.title })}
                className="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-shadow duration-300 hover:shadow-md"
              >
                <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                  {album.coverImageUrl ? (
                    <Image
                      src={album.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-10" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <Badge variant={album.published ? "default" : "secondary"}>
                      {album.published ? t("published") : t("draft")}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <h3 className="font-semibold">
                    {album.parentId ? "↳ " : ""}
                    {album.title}
                  </h3>
                  {album.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {album.description}
                    </p>
                  ) : null}
                </div>
              </button>
              {canWrite ? (
                <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-background/90 p-0.5 shadow-sm">
                  {albumActions(album)}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.title")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-0">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {albums.map((album) => (
                <TableRow
                  key={album.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => openAlbum(album)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openAlbum(album);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    <span className={album.parentId ? "pl-4 text-muted-foreground" : ""}>
                      {album.parentId ? "↳ " : ""}
                      {album.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={album.published ? "default" : "secondary"}>
                      {album.published ? t("published") : t("draft")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {albumActions(album)}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlbumFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        album={selectedAlbum}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { title: deleteTarget?.title ?? "" })}
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
    </div>
  );
};

export const AlbumsAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-56 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
