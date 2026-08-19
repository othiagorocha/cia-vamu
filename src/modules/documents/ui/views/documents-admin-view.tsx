"use client";

import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DownloadIcon,
  FileAudioIcon,
  FileTextIcon,
  FolderIcon,
  FolderInputIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
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
import { formatBrazilDateTimeShort } from "@/lib/brazil-datetime";
import { useAdminViewMode } from "@/lib/admin-view-mode";
import { uploadFileToSignedUrl } from "@/lib/upload-to-signed-url";
import { useToastError } from "@/lib/use-toast-error";
import { cn } from "@/lib/utils";
import {
  dataTransferHasFiles,
  filesFromDataTransfer,
} from "@/modules/documents/files-from-drop";
import {
  DOCUMENT_MAX_SIZE_BYTES,
  isAudioMimeType,
  mimeTypeFromFile,
} from "@/modules/documents/schema";
import type {
  DocumentFileRecord,
  DocumentFolderRecord,
} from "@/modules/documents/types";
import { DocumentsBreadcrumb } from "@/modules/documents/ui/components/documents-breadcrumb";
import { DocumentsNameDialog } from "@/modules/documents/ui/components/documents-name-dialog";
import {
  DocumentsMoveDialog,
  type DocumentsMoveTarget,
} from "@/modules/documents/ui/components/documents-move-dialog";
import { DocumentsPreviewDialog } from "@/modules/documents/ui/components/documents-preview-dialog";
import {
  DocumentsUploadDialog,
  type DocumentUploadItem,
} from "@/modules/documents/ui/components/documents-upload-dialog";
import { AdminViewModeToggle } from "@/modules/dashboard/ui/components/admin-view-mode-toggle";
import { trpc } from "@/trpc/client";

type DocumentsAdminViewProps = {
  folderId: string | null;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeKey = (mimeType: string) => {
  if (mimeType === "application/pdf") {
    return "pdf" as const;
  }

  if (mimeType === "text/markdown") {
    return "markdown" as const;
  }

  if (mimeType === "text/plain") {
    return "text" as const;
  }

  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "word" as const;
  }

  if (isAudioMimeType(mimeType)) {
    return "audio" as const;
  }

  return "file" as const;
};

export const DocumentsAdminView = ({ folderId }: DocumentsAdminViewProps) => {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const router = useRouter();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folder] = trpc.documents.listFolder.useSuspenseQuery({ folderId });
  const [viewMode, setViewMode] = useAdminViewMode();
  const [isUploading, setIsUploading] = useState(false);
  const [folderDialog, setFolderDialog] = useState<"create" | "rename" | null>(
    null,
  );
  const [renameFolder, setRenameFolder] = useState<DocumentFolderRecord | null>(
    null,
  );
  const [renameFile, setRenameFile] = useState<DocumentFileRecord | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<DocumentFolderRecord | null>(
    null,
  );
  const [deleteFile, setDeleteFile] = useState<DocumentFileRecord | null>(null);
  const [previewFile, setPreviewFile] = useState<DocumentFileRecord | null>(
    null,
  );
  const [moveTarget, setMoveTarget] = useState<DocumentsMoveTarget | null>(
    null,
  );
  const [uploadItems, setUploadItems] = useState<DocumentUploadItem[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCountRef = useRef(0);

  const invalidate = () => {
    utils.documents.listFolder.invalidate({ folderId });
  };

  const createFolderMutation = trpc.documents.createFolder.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      setFolderDialog(null);
      invalidate();
    },
    onError: toastError,
  });

  const renameFolderMutation = trpc.documents.renameFolder.useMutation({
    onSuccess: () => {
      toast.success(t("folderRenamed"));
      setRenameFolder(null);
      invalidate();
    },
    onError: toastError,
  });

  const removeFolderMutation = trpc.documents.removeFolder.useMutation({
    onSuccess: () => {
      toast.success(t("folderRemoved"));
      setDeleteFolder(null);
      invalidate();
    },
    onError: toastError,
  });

  const createUploadMutation = trpc.documents.createUpload.useMutation();
  const confirmUploadMutation = trpc.documents.confirmUpload.useMutation();
  const renameFileMutation = trpc.documents.renameFile.useMutation({
    onSuccess: () => {
      toast.success(t("fileRenamed"));
      setRenameFile(null);
      invalidate();
    },
    onError: toastError,
  });
  const removeFileMutation = trpc.documents.removeFile.useMutation({
    onSuccess: () => {
      toast.success(t("fileRemoved"));
      setDeleteFile(null);
      invalidate();
    },
    onError: toastError,
  });
  const downloadMutation = trpc.documents.getDownloadUrl.useMutation({
    onError: toastError,
  });
  const moveFileMutation = trpc.documents.moveFile.useMutation({
    onSuccess: () => {
      toast.success(t("fileMoved"));
      setMoveTarget(null);
      utils.documents.listFolder.invalidate();
      utils.documents.listFolderTree.invalidate();
    },
    onError: toastError,
  });
  const moveFolderMutation = trpc.documents.moveFolder.useMutation({
    onSuccess: () => {
      toast.success(t("folderMoved"));
      setMoveTarget(null);
      utils.documents.listFolder.invalidate();
      utils.documents.listFolderTree.invalidate();
    },
    onError: toastError,
  });

  const updateUploadItem = (id: string, patch: Partial<DocumentUploadItem>) => {
    setUploadItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleDownloadFile = async (file: DocumentFileRecord) => {
    const result = await downloadMutation.mutateAsync({
      id: file.id,
      download: true,
    });
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const handleFilesSelected = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const files = Array.from(fileList);
    const items: DocumentUploadItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      progress: 0,
      status: "queued",
    }));

    setUploadItems(items);
    setUploadOpen(true);
    setIsUploading(true);

    let uploadedCount = 0;

    try {
      for (const [index, file] of files.entries()) {
        const item = items[index];
        if (!item) {
          continue;
        }

        const mimeType = mimeTypeFromFile(file);

        if (!mimeType) {
          updateUploadItem(item.id, {
            status: "skipped",
            progress: 100,
            message: t("invalidType"),
          });
          continue;
        }

        if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
          updateUploadItem(item.id, {
            status: "skipped",
            progress: 100,
            message: t("tooLarge"),
          });
          continue;
        }

        try {
          updateUploadItem(item.id, { status: "uploading", progress: 0 });
          const upload = await createUploadMutation.mutateAsync({
            folderId,
            contentType: mimeType,
            fileName: file.name,
            sizeBytes: file.size,
          });
          const uploadFile = new File([file], file.name, { type: mimeType });
          await uploadFileToSignedUrl(upload.signedUrl, uploadFile, (percent) => {
            updateUploadItem(item.id, {
              status: "uploading",
              progress: percent,
            });
          });
          updateUploadItem(item.id, { status: "saving", progress: 100 });
          await confirmUploadMutation.mutateAsync({
            folderId,
            storagePath: upload.path,
            name: file.name,
            mimeType,
            sizeBytes: file.size,
          });
          updateUploadItem(item.id, { status: "done", progress: 100 });
          uploadedCount += 1;
        } catch (error) {
          updateUploadItem(item.id, {
            status: "error",
            message:
              error instanceof Error ? error.message : t("uploadError"),
          });
        }
      }

      if (uploadedCount > 0) {
        invalidate();
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    const preventNavigation = (event: DragEvent) => {
      if (dataTransferHasFiles(event.dataTransfer)) {
        event.preventDefault();
      }
    };

    window.addEventListener("dragover", preventNavigation);
    window.addEventListener("drop", preventNavigation);

    return () => {
      window.removeEventListener("dragover", preventNavigation);
      window.removeEventListener("drop", preventNavigation);
    };
  }, []);

  const resetDragState = () => {
    dragCountRef.current = 0;
    setIsDragging(false);
  };

  const handleDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!dataTransferHasFiles(event.dataTransfer) || isUploading) {
      return;
    }

    event.preventDefault();
    dragCountRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragCountRef.current -= 1;
    if (dragCountRef.current <= 0) {
      resetDragState();
    }
  };

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!dataTransferHasFiles(event.dataTransfer) || isUploading) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    resetDragState();

    if (isUploading) {
      return;
    }

    void filesFromDataTransfer(event.dataTransfer).then((files) => {
      void handleFilesSelected(files);
    });
  };

  const isEmpty = folder.folders.length === 0 && folder.files.length === 0;

  const renderFolderMenu = (item: DocumentFolderRecord) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
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
            setRenameFolder(item);
          }}
        >
          <PencilIcon />
          {t("rename")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            setMoveTarget({
              kind: "folder",
              id: item.id,
              name: item.name,
              parentId: item.parentId,
            });
          }}
        >
          <FolderInputIcon />
          {t("move")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation();
            setDeleteFolder(item);
          }}
        >
          <Trash2Icon />
          {tCommon("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderFileMenu = (file: DocumentFileRecord) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
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
            setPreviewFile(file);
          }}
        >
          <FileTextIcon />
          {t("open")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            void handleDownloadFile(file);
          }}
        >
          <DownloadIcon />
          {t("download")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            setRenameFile(file);
          }}
        >
          <PencilIcon />
          {t("rename")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            setMoveTarget({
              kind: "file",
              id: file.id,
              name: file.name,
              folderId: file.folderId,
            });
          }}
        >
          <FolderInputIcon />
          {t("move")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation();
            setDeleteFile(file);
          }}
        >
          <Trash2Icon />
          {tCommon("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className="relative flex min-h-[24rem] flex-col gap-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-400 bg-background/85">
          <UploadIcon className="size-8 text-orange-400" />
          <p className="font-medium">{t("dropTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("dropHint")}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isEmpty ? (
            <AdminViewModeToggle
              value={viewMode}
              onChange={(mode) => {
                void setViewMode(mode);
              }}
            />
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.md,.txt,.doc,.docx,.mp3,.mp2,.mpga,.mpeg,.mpg,.m4a,.aac,.wav,.ogg,.opus,.flac,audio/mpeg,audio/mp3,audio/*,application/pdf,text/markdown,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => handleFilesSelected(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setFolderDialog("create")}
          >
            <PlusIcon />
            {t("newFolder")}
          </Button>
          <Button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon />
            {t("upload")}
          </Button>
        </div>
      </div>

      <DocumentsBreadcrumb ancestors={folder.ancestors} />

      {isEmpty ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {folderId ? t("empty") : t("emptyRoot")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyDrop")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div
          className={cn(
            "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3",
            isDragging && "rounded-lg ring-2 ring-orange-400",
          )}
        >
          {folder.folders.map((item) => (
            <article key={item.id} className="relative">
              <button
                type="button"
                className="flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-xl bg-card p-4 text-center ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
                onClick={() => router.push(`/admin/documentos/${item.id}`)}
              >
                <FolderIcon className="size-10 text-orange-400" />
                <span className="line-clamp-2 w-full text-sm font-medium">
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("types.folder")}
                </span>
              </button>
              <div className="absolute right-1 top-1">{renderFolderMenu(item)}</div>
            </article>
          ))}
          {folder.files.map((file) => (
            <article key={file.id} className="relative">
              <button
                type="button"
                className="flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-xl bg-card p-4 text-center ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
                onClick={() => setPreviewFile(file)}
              >
                {isAudioMimeType(file.mimeType) ? (
                  <FileAudioIcon className="size-10 text-orange-400" />
                ) : (
                  <FileTextIcon className="size-10 text-muted-foreground" />
                )}
                <span className="line-clamp-2 w-full text-sm font-medium">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`types.${fileTypeKey(file.mimeType)}`)}
                </span>
              </button>
              <div className="absolute right-1 top-1">{renderFileMenu(file)}</div>
            </article>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-lg border",
            isDragging && "border-orange-400",
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.size")}</TableHead>
                <TableHead>{t("columns.updated")}</TableHead>
                <TableHead>{t("columns.author")}</TableHead>
                <TableHead className="w-0">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folder.folders.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/documentos/${item.id}`)}
                >
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <FolderIcon className="size-4 text-orange-400" />
                      {item.name}
                    </span>
                  </TableCell>
                  <TableCell>{t("types.folder")}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>
                    {formatBrazilDateTimeShort(item.updatedAt)}
                  </TableCell>
                  <TableCell>{item.createdByName ?? "—"}</TableCell>
                  <TableCell>{renderFolderMenu(item)}</TableCell>
                </TableRow>
              ))}
              {folder.files.map((file) => (
                <TableRow
                  key={file.id}
                  className="cursor-pointer"
                  onClick={() => setPreviewFile(file)}
                >
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {isAudioMimeType(file.mimeType) ? (
                        <FileAudioIcon className="size-4 text-orange-400" />
                      ) : (
                        <FileTextIcon className="size-4 text-muted-foreground" />
                      )}
                      {file.name}
                    </span>
                  </TableCell>
                  <TableCell>{t(`types.${fileTypeKey(file.mimeType)}`)}</TableCell>
                  <TableCell>{formatSize(file.sizeBytes)}</TableCell>
                  <TableCell>
                    {formatBrazilDateTimeShort(file.updatedAt)}
                  </TableCell>
                  <TableCell>{file.createdByName ?? "—"}</TableCell>
                  <TableCell>{renderFileMenu(file)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DocumentsPreviewDialog
        file={previewFile}
        open={Boolean(previewFile)}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        onDownload={(file) => {
          void handleDownloadFile(file);
        }}
      />

      <DocumentsMoveDialog
        target={moveTarget}
        open={Boolean(moveTarget)}
        isSubmitting={
          moveFileMutation.isPending || moveFolderMutation.isPending
        }
        onOpenChange={(open) => !open && setMoveTarget(null)}
        onMove={(destinationId) => {
          if (!moveTarget) {
            return;
          }

          if (moveTarget.kind === "file") {
            moveFileMutation.mutate({
              id: moveTarget.id,
              folderId: destinationId,
            });
            return;
          }

          moveFolderMutation.mutate({
            id: moveTarget.id,
            parentId: destinationId,
          });
        }}
      />

      <DocumentsUploadDialog
        open={uploadOpen}
        items={uploadItems}
        busy={isUploading}
        onOpenChange={setUploadOpen}
      />

      <DocumentsNameDialog
        open={folderDialog === "create"}
        title={t("createFolderTitle")}
        label={t("folderName")}
        isSubmitting={createFolderMutation.isPending}
        onOpenChange={(open) => !open && setFolderDialog(null)}
        onSubmit={(name) =>
          createFolderMutation.mutate({ name, parentId: folderId })
        }
      />

      <DocumentsNameDialog
        open={Boolean(renameFolder)}
        title={t("renameFolderTitle")}
        label={t("folderName")}
        initialName={renameFolder?.name ?? ""}
        isSubmitting={renameFolderMutation.isPending}
        onOpenChange={(open) => !open && setRenameFolder(null)}
        onSubmit={(name) =>
          renameFolder &&
          renameFolderMutation.mutate({ id: renameFolder.id, name })
        }
      />

      <DocumentsNameDialog
        open={Boolean(renameFile)}
        title={t("renameFileTitle")}
        label={t("fileName")}
        initialName={renameFile?.name ?? ""}
        isSubmitting={renameFileMutation.isPending}
        onOpenChange={(open) => !open && setRenameFile(null)}
        onSubmit={(name) =>
          renameFile && renameFileMutation.mutate({ id: renameFile.id, name })
        }
      />

      <AlertDialog
        open={Boolean(deleteFolder)}
        onOpenChange={(open) => !open && setDeleteFolder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteFolderTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteFolderDescription", { name: deleteFolder?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteFolder &&
                removeFolderMutation.mutate({ id: deleteFolder.id })
              }
            >
              {tCommon("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteFile)}
        onOpenChange={(open) => !open && setDeleteFile(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteFileTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteFileDescription", { name: deleteFile?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteFile && removeFileMutation.mutate({ id: deleteFile.id })
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

export const DocumentsAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
};
