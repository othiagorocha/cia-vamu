"use client";

import { useState } from "react";
import Link from "next/link";
import { ImagesIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { AlbumFormDialog } from "@/modules/albums/ui/components/album-form-dialog";
import type { AlbumFormInput } from "@/modules/albums/schema";
import type { AlbumRecord } from "@/modules/albums/types";
import { trpc } from "@/trpc/client";

export const AlbumsAdminView = () => {
  const utils = trpc.useUtils();
  const [albums] = trpc.albums.listAll.useSuspenseQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlbumRecord | null>(null);

  const invalidate = () => {
    utils.albums.listAll.invalidate();
    utils.albums.listPublished.invalidate();
  };

  const createMutation = trpc.albums.create.useMutation({
    onSuccess: () => {
      toast.success("Álbum criado com sucesso.");
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.albums.update.useMutation({
    onSuccess: () => {
      toast.success("Álbum atualizado com sucesso.");
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const removeMutation = trpc.albums.remove.useMutation({
    onSuccess: () => {
      toast.success("Álbum removido.");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (values: AlbumFormInput) => {
    if (selectedAlbum) {
      updateMutation.mutate({ id: selectedAlbum.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Álbuns</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os álbuns e fotos da galeria pública.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedAlbum(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon />
          Novo álbum
        </Button>
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p>Nenhum álbum cadastrado ainda.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {albums.map((album) => (
                <TableRow key={album.id}>
                  <TableCell className="font-medium">{album.title}</TableCell>
                  <TableCell>
                    <Badge variant={album.published ? "default" : "secondary"}>
                      {album.published ? "Publicado" : "Rascunho"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link
                          href={`/dashboard/albums/${album.id}`}
                          aria-label="Gerenciar fotos"
                        >
                          <ImagesIcon className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setSelectedAlbum(album);
                          setFormOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(album)}
                        aria-label="Excluir"
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </div>
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
            <AlertDialogTitle>Excluir álbum?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O álbum &quot;{deleteTarget?.title}
              &quot; e todas as suas fotos serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && removeMutation.mutate({ id: deleteTarget.id })
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

export const AlbumsAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
};
