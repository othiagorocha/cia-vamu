"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ImageIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { groupAlbumsByParent } from "@/modules/albums/group-albums";
import { trpc } from "@/trpc/client";

const ALBUM_GRID_CLASS =
  "grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]";

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

  const groupedAlbums = useMemo(
    () => groupAlbumsByParent(albums),
    [albums],
  );

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

  const albumCover = (album: AdminAlbumCard) => (
    <span className="relative aspect-4/3 w-full overflow-hidden bg-muted">
      {album.coverImageUrl ? (
        <Image
          src={album.coverImageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 240px, 100vw"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground">
          <ImageIcon className="size-10" />
        </span>
      )}
    </span>
  );

  const albumThumb = (album: AdminAlbumCard) => (
    <span className="relative size-8 shrink-0 overflow-hidden rounded-md bg-muted">
      {album.coverImageUrl ? (
        <Image
          src={album.coverImageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="32px"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground">
          <ImageIcon className="size-3.5" />
        </span>
      )}
    </span>
  );

  const albumMenu = (album: AdminAlbumCard, overlay = false) =>
    canWrite ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-11",
              overlay && "bg-background/80 backdrop-blur hover:bg-background/90",
            )}
            aria-label={t("columns.actions")}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              setSelectedAlbum(album);
              setFormOpen(true);
            }}
          >
            <PencilIcon />
            {tCommon("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteTarget(album);
            }}
          >
            <Trash2Icon />
            {tCommon("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

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

  const renderAlbumCard = (
    album: AdminAlbumCard,
    children: AdminAlbumCard[],
  ) => {
    const hasChildren = children.length > 0;

    return (
      <article
        key={album.id}
        className="relative flex h-full flex-col overflow-hidden rounded-lg border bg-card"
      >
        <button
          type="button"
          onClick={() => openAlbum(album)}
          aria-label={t("openAlbum", { title: album.title })}
          className="flex min-w-0 flex-1 cursor-pointer flex-col text-left transition-colors hover:bg-muted/30"
        >
          {albumCover(album)}
          <span className="flex flex-col gap-1 p-3">
            <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold">
              {album.title}
            </h3>
            <p className="text-xs tabular-nums text-muted-foreground">
              {t("photoCount", { count: album.photoCount })}
              {hasChildren
                ? ` · ${t("childCount", { count: children.length })}`
                : null}
            </p>
          </span>
        </button>

        <Badge
          variant={album.published ? "default" : "secondary"}
          className="pointer-events-none absolute left-2 top-2"
        >
          {album.published ? t("published") : t("draft")}
        </Badge>
        {canWrite ? (
          <div className="absolute right-1 top-1 z-10">
            {albumMenu(album, true)}
          </div>
        ) : null}

        {hasChildren ? (
          <div className="mt-auto border-t border-foreground/10 bg-muted/40 px-2 py-2">
            <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("childrenTitle")}
              <span className="ml-1 tabular-nums normal-case tracking-normal">
                ({children.length})
              </span>
            </p>
            <ul className="mt-1 flex flex-col">
              {children.map((child) => (
                <li key={child.id} className="flex min-w-0 items-center">
                  <button
                    type="button"
                    onClick={() => openAlbum(child)}
                    aria-label={t("openAlbum", { title: child.title })}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left hover:bg-background/80"
                  >
                    {albumThumb(child)}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {child.title}
                    </span>
                    {child.published ? null : (
                      <Badge variant="secondary" className="shrink-0">
                        {t("draft")}
                      </Badge>
                    )}
                  </button>
                  {canWrite ? (
                    <div className="shrink-0">{albumMenu(child)}</div>
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
        <div className={ALBUM_GRID_CLASS}>
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
      <div className={ALBUM_GRID_CLASS}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-4/3 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
