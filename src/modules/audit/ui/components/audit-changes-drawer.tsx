"use client";

import { useSyncExternalStore } from "react";
import { ArrowDownIcon, ArrowRightIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const DESKTOP_QUERY = "(min-width: 768px)";

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
  description: string;
  changes: AuditChangeRow[];
};

export const AuditChangesDrawer = ({
  open,
  onOpenChange,
  description,
  changes,
}: AuditChangesDrawerProps) => {
  const t = useTranslations("audit");
  const tCommon = useTranslations("common.actions");
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    () => false,
  );

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isDesktop ? "right" : "bottom"}
      shouldScaleBackground={false}
      repositionInputs={false}
    >
      <DrawerContent className="min-w-0 gap-0 p-0 data-[vaul-drawer-direction=bottom]:max-h-[85vh] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-md">
        <DrawerClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3 z-10"
          >
            <XIcon />
            <span className="sr-only">{tCommon("close")}</span>
          </Button>
        </DrawerClose>

        <DrawerHeader className="border-b px-4 py-4 pr-12 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left sm:px-5">
          <DrawerTitle>{t("viewChangesTitle")}</DrawerTitle>
          <DrawerDescription className="text-pretty">
            {description}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-clip px-4 py-4 sm:px-5">
          {changes.map((change) => (
            <div
              key={`${change.field}-${change.from}-${change.to}`}
              className="min-w-0 overflow-hidden rounded-lg border bg-muted/30 p-4"
            >
              <p className="text-sm font-medium">{change.field}</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {t("changesFrom")}
                  </span>
                  <span className="break-words rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground">
                    {change.from}
                  </span>
                </div>
                <ArrowDownIcon
                  aria-hidden
                  className="mx-auto size-4 shrink-0 text-orange-400 sm:hidden"
                />
                <ArrowRightIcon
                  aria-hidden
                  className="mt-6 hidden size-4 shrink-0 text-orange-400 sm:block"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {t("changesTo")}
                  </span>
                  <span className="break-words rounded-lg bg-background px-3 py-2 text-sm font-medium">
                    {change.to}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
