"use client";

import { LayoutGridIcon, TableIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { AdminViewMode } from "@/lib/admin-view-mode";

type AdminViewModeToggleProps = {
  value: AdminViewMode;
  onChange: (mode: AdminViewMode) => void;
};

export const AdminViewModeToggle = ({
  value,
  onChange,
}: AdminViewModeToggleProps) => {
  const t = useTranslations("common");

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant={value === "grid" ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={t("viewGrid")}
        aria-pressed={value === "grid"}
        onClick={() => onChange("grid")}
      >
        <LayoutGridIcon />
      </Button>
      <Button
        type="button"
        variant={value === "table" ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={t("viewTable")}
        aria-pressed={value === "table"}
        onClick={() => onChange("table")}
      >
        <TableIcon />
      </Button>
    </div>
  );
};
