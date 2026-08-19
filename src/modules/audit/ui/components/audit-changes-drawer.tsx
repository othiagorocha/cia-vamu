"use client";

import { useSyncExternalStore } from "react";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const DESKTOP_QUERY = "(min-width: 640px)";

const subscribeDesktop = (onStoreChange: () => void) => {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
};

const getDesktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;

export type AuditChangeRow = {
  field: string;
  from: string;
  to: string;
};

type AuditChangesDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  target: string;
  actorName: string;
  when: string;
  changes: AuditChangeRow[];
};

export const AuditChangesDrawer = ({
  open,
  onOpenChange,
  action,
  target,
  actorName,
  when,
  changes,
}: AuditChangesDrawerProps) => {
  const t = useTranslations("audit");
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    () => true,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className="gap-0 p-0 sm:max-w-md data-[side=bottom]:max-h-[85vh] data-[side=bottom]:rounded-t-2xl"
      >
        <SheetHeader className="border-b p-4 pr-12">
          <SheetTitle>{t("viewChangesTitle")}</SheetTitle>
          <SheetDescription>
            {t("viewChangesDescription", {
              action,
              target,
              actor: actorName,
              when,
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {changes.map((change) => (
            <div
              key={`${change.field}-${change.from}-${change.to}`}
              className="rounded-lg border bg-muted/30 p-3"
            >
              <p className="text-sm font-medium">{change.field}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {t("changesFrom")}
                  </span>
                  <span className="max-w-full rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">
                    {change.from}
                  </span>
                </div>
                <ArrowRightIcon className="mt-4 size-3.5 shrink-0 text-orange-400" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {t("changesTo")}
                  </span>
                  <span className="max-w-full rounded-full bg-background px-2.5 py-1 text-xs font-medium">
                    {change.to}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
