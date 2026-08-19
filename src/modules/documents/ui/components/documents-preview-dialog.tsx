"use client";

import { DownloadIcon, FileAudioIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isAudioMimeType } from "@/modules/documents/schema";
import type { DocumentFileRecord } from "@/modules/documents/types";
import { trpc } from "@/trpc/client";

type DocumentsPreviewDialogProps = {
  file: DocumentFileRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (file: DocumentFileRecord) => void;
};

const previewBodyClassName =
  "document-preview min-h-0 flex-1 overflow-auto rounded-lg border bg-background p-4 text-sm leading-relaxed [&_a]:text-orange-400 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-4 [&_img]:max-w-full [&_li]:my-0.5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_table]:my-3 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6";

export const DocumentsPreviewDialog = ({
  file,
  open,
  onOpenChange,
  onDownload,
}: DocumentsPreviewDialogProps) => {
  const t = useTranslations("documents");
  const previewQuery = trpc.documents.getPreview.useQuery(
    { id: file?.id ?? "" },
    { enabled: open && Boolean(file) },
  );

  const preview = previewQuery.data;
  const compact = Boolean(file && isAudioMimeType(file.mimeType));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex w-[calc(100%-1rem)] max-w-5xl flex-col gap-3 overflow-hidden sm:max-w-5xl",
          compact ? "sm:max-w-lg" : "h-[90dvh] max-h-[90dvh]",
        )}
      >
        <DialogHeader className="pr-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate">
                {file?.name ?? t("preview.title")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("preview.title")}
              </DialogDescription>
            </div>
            {file ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDownload(file)}
              >
                <DownloadIcon />
                {t("download")}
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        {previewQuery.isLoading ? (
          <div className="min-h-0 flex-1 animate-pulse rounded-lg bg-muted" />
        ) : previewQuery.isError || !preview ? (
          <p className="text-sm text-muted-foreground">{t("preview.error")}</p>
        ) : preview.kind === "pdf" ? (
          <iframe
            title={preview.name}
            src={preview.url}
            className="min-h-0 flex-1 w-full rounded-lg border bg-muted"
          />
        ) : preview.kind === "audio" ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/30 px-4 py-8">
            <FileAudioIcon className="size-10 text-orange-400" />
            <audio
              controls
              preload="metadata"
              src={preview.url}
              className="w-full"
            >
              {t("preview.unavailable")}
            </audio>
          </div>
        ) : preview.kind === "text" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {preview.truncated ? (
              <p className="text-xs text-muted-foreground">
                {t("preview.truncated")}
              </p>
            ) : null}
            <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-background p-4 font-mono text-sm whitespace-pre-wrap">
              {preview.body || t("preview.empty")}
            </pre>
          </div>
        ) : preview.kind === "html" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {preview.truncated ? (
              <p className="text-xs text-muted-foreground">
                {t("preview.truncated")}
              </p>
            ) : null}
            {preview.html ? (
              <div
                className={previewBodyClassName}
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("preview.empty")}
              </p>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-4">
            <p className="text-sm text-muted-foreground">
              {t("preview.unavailable")}
            </p>
            {file ? (
              <Button type="button" onClick={() => onDownload(file)}>
                <DownloadIcon />
                {t("download")}
              </Button>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
