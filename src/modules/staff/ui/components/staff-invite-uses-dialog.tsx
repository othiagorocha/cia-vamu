"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBrazilDateTimeShort } from "@/lib/brazil-datetime";
import { trpc } from "@/trpc/client";

type StaffInviteUsesDialogProps = {
  inviteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const StaffInviteUsesDialog = ({
  inviteId,
  open,
  onOpenChange,
}: StaffInviteUsesDialogProps) => {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const usesQuery = trpc.staff.listUses.useQuery(
    { id: inviteId ?? "" },
    { enabled: open && Boolean(inviteId) },
  );

  const uses = usesQuery.data?.uses ?? [];
  const usedCount = usesQuery.data?.usedCount ?? uses.length;
  const unrecordedCount = Math.max(usedCount - uses.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite.usesTitle")}</DialogTitle>
          <DialogDescription>
            {t("invite.usesDescription", { count: usedCount })}
          </DialogDescription>
        </DialogHeader>

        {usesQuery.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : uses.length === 0 && unrecordedCount === 0 ? (
          <p className="text-sm text-muted-foreground">{t("invite.usesEmpty")}</p>
        ) : (
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {uses.map((use) => (
              <div
                key={use.id}
                className="flex flex-col gap-1 rounded-lg border px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{use.name}</span>
                  {!use.userExists ? (
                    <Badge variant="secondary">{t("invite.usesRemoved")}</Badge>
                  ) : null}
                  {use.userExists && use.disabled ? (
                    <Badge variant="secondary">{t("deactivated")}</Badge>
                  ) : null}
                </div>
                <span className="text-sm text-muted-foreground">{use.email}</span>
                <span
                  className="text-xs text-muted-foreground"
                  title={formatBrazilDateTimeShort(use.createdAt)}
                >
                  {formatDistanceToNow(use.createdAt, {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
            {unrecordedCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("invite.usesUnrecorded", { count: unrecordedCount })}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
