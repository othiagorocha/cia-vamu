"use client";

import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { AdminViewModeToggle } from "@/modules/dashboard/ui/components/admin-view-mode-toggle";
import { AlbumFormDialog } from "@/modules/albums/ui/components/album-form-dialog";
import type { AlbumFormInput } from "@/modules/albums/schema";
import type { AdminAlbumCard } from "@/modules/albums/types";
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
  const [selectedAlbum, setSelectedAlbum] = useState<AdminAlbumCard | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminAlbumCard | null>(null);

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

  const groupedAlbums = useMemo(() => {
    const ids = new Set(albums.map((album) => album.id));
    const childrenByParent = new Map<string, AdminAlbumCard[]>();
    const roots: AdminAlbumCard[] = [];

    for (const album of albums) {
      if (!album.parentId || !ids.has(album.parentId)) {
        roots.push(album);
        continue;
      }

      const siblings = childrenByParent.get(album.parentId) ?? [];
      siblings.push(album);
      childrenByParent.set(album.parentId, siblings);
    }

    return { roots, childrenByParent };
  }, [albums]);

  const handleSubmit = (values: AlbumFormInput) => {
    if (selectedAlbum) {
      updateMutation.mutate({ id: selectedAlbum.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openAlbum = (album: AdminAlbumCard) => {
    router.push(`/admin/albums/${album.id}`);
  };

  const albumCover = (
    album: AdminAlbumCard,
    sizeClass: string,
    sizes: string,
    iconClass = "size-4",
  ) => (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-muted",
        sizeClass,
      )}
    >
      {album.coverImageUrl ? (
        <Image
          src={album.coverImageUrl}
          alt=""
          fill
          className="object-cover"
          sizes={sizes}
        />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground">
          <ImageIcon className={iconClass} />
        </span>
      )}
    </span>
  );

  const albumActions = (album: AdminAlbumCard) =>
    canWrite ? (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
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
          size="icon"
          className="size-11"
          onClick={() => setDeleteTarget(album)}
          aria-label={tCommon("actions.delete")}
        >
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </>
    ) : null;

  const renderAlbumCard = (album: AdminAlbumCard, children: AdminAlbumCard[]) => {
    const hasChildren = children.length > 0;

    return (
    <article
      key={album.id}
      className="flex h-full flex-col overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex items-start justify-between gap-2 p-3 pb-1">
        <Badge
          variant={album.published ? "default" : "secondary"}
          className="w-fit"
        >
          {album.published ? t("published") : t("draft")}
        </Badge>
        {canWrite ? (
          <div className="flex shrink-0 items-center">{albumActions(album)}</div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => openAlbum(album)}
        aria-label={t("openAlbum", { title: album.title })}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer rounded-md p-3 pt-2 transition-colors hover:bg-muted/30",
          hasChildren
            ? "flex-row items-center gap-3 text-left"
            : "flex-col items-center justify-center gap-2 text-center",
        )}
      >
        {albumCover(
          album,
          hasChildren ? "size-14 sm:size-16" : "size-24 sm:size-28",
          hasChildren ? "64px" : "112px",
          hasChildren ? "size-4" : "size-8",
        )}
        <div className={cn("min-w-0", hasChildren ? "flex-1" : "w-full")}>
          <h3
            className={cn(
              "font-semibold",
              hasChildren ? "truncate" : "line-clamp-2",
            )}
          >
            {album.title}
          </h3>
          <p className="text-xs tabular-nums text-muted-foreground">
            {t("photoCount", { count: album.photoCount })}
          </p>
          {album.description ? (
            <p
              className={cn(
                "mt-1 line-clamp-2 text-sm text-muted-foreground",
                !hasChildren && "mx-auto max-w-prose",
              )}
            >
              {album.description}
            </p>
          ) : null}
        </div>
      </button>

      {hasChildren ? (
        <div className="mt-auto border-t border-foreground/10 bg-muted/40 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("childrenTitle")}
            <span className="ml-1 tabular-nums normal-case tracking-normal">
              ({children.length})
            </span>
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {children.map((child) => (
              <li key={child.id} className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openAlbum(child)}
                  aria-label={t("openAlbum", { title: child.title })}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-background/80"
                >
                  {albumCover(child, "size-9", "36px")}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {child.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {t("childOf", { title: album.title })}
                    </span>
                  </span>
                  <Badge
                    variant={child.published ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {child.published ? t("published") : t("draft")}
                  </Badge>
                </button>
                {canWrite ? (
                  <div className="flex shrink-0 items-center">
                    {albumActions(child)}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
    );
  };

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groupedAlbums.roots.map((album) =>
            renderAlbumCard(
              album,
              groupedAlbums.childrenByParent.get(album.id) ?? [],
            ),
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.title")}</TableHead>
                <TableHead className="whitespace-nowrap">
                  {t("columns.photos")}
                </TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-0">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedAlbums.roots.flatMap((album) => {
                const children =
                  groupedAlbums.childrenByParent.get(album.id) ?? [];

                return [
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
                    <TableCell className="font-medium">{album.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {t("photoCount", { count: album.photoCount })}
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
                  </TableRow>,
                  ...children.map((child) => (
                    <TableRow
                      key={child.id}
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => openAlbum(child)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openAlbum(child);
                        }
                      }}
                    >
                      <TableCell>
                        <span className="flex min-w-0 flex-col pl-6">
                          <span className="font-medium">{child.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {t("childOf", { title: album.title })}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {t("photoCount", { count: child.photoCount })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={child.published ? "default" : "secondary"}
                        >
                          {child.published ? t("published") : t("draft")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canWrite ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {albumActions(child)}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )),
                ];
              })}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
