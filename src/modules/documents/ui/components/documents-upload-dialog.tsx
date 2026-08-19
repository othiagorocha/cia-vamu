"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileTextIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type DocumentUploadStatus =
  | "queued"
  | "uploading"
  | "saving"
  | "done"
  | "error"
  | "skipped";

export type DocumentUploadItem = {
  id: string;
  name: string;
  progress: number;
  status: DocumentUploadStatus;
  message?: string;
};

type DocumentsUploadDialogProps = {
  open: boolean;
  items: DocumentUploadItem[];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
};

const statusPercent = (item: DocumentUploadItem) => {
  if (item.status === "done" || item.status === "skipped") {
    return 100;
  }

  if (item.status === "saving") {
    return 100;
  }

  if (item.status === "error") {
    return item.progress;
  }

  return item.progress;
};

export const DocumentsUploadDialog = ({
  open,
  items,
  busy,
  onOpenChange,
}: DocumentsUploadDialogProps) => {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const total = items.length;
  const finished = items.filter(
    (item) =>
      item.status === "done" ||
      item.status === "error" ||
      item.status === "skipped",
  ).length;
  const succeeded = items.filter((item) => item.status === "done").length;
  const overall =
    total === 0
      ? 0
      : Math.round(
          items.reduce((sum, item) => sum + statusPercent(item), 0) / total,
        );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (busy && !nextOpen) {
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!busy}
        onPointerDownOutside={(event) => {
          if (busy) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (busy) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            {busy ? (
              <Loader2Icon className="size-4 animate-spin text-orange-400" />
            ) : (
              <UploadIcon className="size-4 text-orange-400" />
            )}
            {busy ? t("uploadProgress.title") : t("uploadProgress.doneTitle")}
          </DialogTitle>
          <DialogDescription>
            {busy
              ? t("uploadProgress.sending", {
                  current: Math.min(finished + 1, total),
                  total,
                })
              : t("uploadProgress.done", { count: succeeded, total })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-orange-400 transition-[width] duration-300"
              style={{ width: `${overall}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{overall}%</p>
        </div>

        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border bg-muted/30 px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <StatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.message ?? t(`uploadProgress.status.${item.status}`)}
                  </p>
                  {item.status === "uploading" || item.status === "saving" ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full bg-orange-400 transition-[width] duration-200",
                          item.status === "saving" && "w-full",
                        )}
                        style={
                          item.status === "uploading"
                            ? { width: `${item.progress}%` }
                            : undefined
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!busy ? (
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              {tCommon("actions.close")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const StatusIcon = ({ status }: { status: DocumentUploadStatus }) => {
  if (status === "done") {
    return <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-orange-400" />;
  }

  if (status === "error" || status === "skipped") {
    return (
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
    );
  }

  if (status === "uploading" || status === "saving") {
    return (
      <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-orange-400" />
    );
  }

  return (
    <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
  );
};
