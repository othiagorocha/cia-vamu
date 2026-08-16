"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBrazilDateTime } from "@/lib/brazil-datetime";
import type { PrayerRequestRecord } from "@/modules/prayers/types";

type PrayerRequestDialogProps = {
  request: PrayerRequestRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
};

export const PrayerRequestDialog = ({
  request,
  open,
  onOpenChange,
  canManage,
  onDelete,
  isDeleting,
}: PrayerRequestDialogProps) => {
  const t = useTranslations("prayers");
  const tCommon = useTranslations("common");

  if (!request) {
    return null;
  }

  const authorLabel = request.isAnonymous
    ? t("anonymous")
    : (request.name ?? t("anonymous"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{authorLabel}</DialogTitle>
          <DialogDescription>
            {formatBrazilDateTime(request.createdAt)}
            {!request.isAnonymous && request.email ? ` · ${request.email}` : ""}
          </DialogDescription>
        </DialogHeader>

        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {request.body}
        </p>

        {canManage && onDelete ? (
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => onDelete(request.id)}
            >
              {tCommon("actions.delete")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
