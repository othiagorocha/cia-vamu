"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PrayerRequestForm } from "@/modules/prayers/ui/components/prayer-request-form";

type PrayerRequestFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export const PrayerRequestFormDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: PrayerRequestFormDialogProps) => {
  const t = useTranslations("prayers");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <PrayerRequestForm
          onSuccess={() => {
            onSuccess?.();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
