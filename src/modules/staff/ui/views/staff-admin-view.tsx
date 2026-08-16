"use client";

import { useState } from "react";
import { KeyRoundIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import type { SiteCapability } from "@/lib/permissions";
import { StaffFormDialog } from "@/modules/staff/ui/components/staff-form-dialog";
import { StaffPasswordDialog } from "@/modules/staff/ui/components/staff-password-dialog";
import type { StaffFormInput, UpdateStaffFormInput } from "@/modules/staff/schema";
import type { StaffRecord } from "@/modules/staff/types";
import { trpc } from "@/trpc/client";

const CAPABILITY_LABELS: Record<SiteCapability, "events" | "albums" | "users"> = {
  "events:write": "events",
  "albums:write": "albums",
  "users:manage": "users",
};

type StaffAdminViewProps = {
  currentUserId: string;
};

export const StaffAdminView = ({ currentUserId }: StaffAdminViewProps) => {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const [staffList] = trpc.staff.list.useSuspenseQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<StaffRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null);

  const invalidate = () => {
    utils.staff.list.invalidate();
  };

  const createMutation = trpc.staff.create.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.staff.update.useMutation({
    onSuccess: () => {
      toast.success(t("updated"));
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const passwordMutation = trpc.staff.setPassword.useMutation({
    onSuccess: () => {
      toast.success(t("passwordUpdated"));
      setPasswordTarget(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const removeMutation = trpc.staff.remove.useMutation({
    onSuccess: () => {
      toast.success(t("removed"));
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreate = (values: StaffFormInput) => {
    createMutation.mutate(values);
  };

  const handleUpdate = (values: UpdateStaffFormInput) => {
    if (!selectedStaff) {
      return;
    }

    updateMutation.mutate({ id: selectedStaff.id, ...values });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setSelectedStaff(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon />
          {t("new")}
        </Button>
      </div>

      {staffList.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead>{t("columns.permissions")}</TableHead>
                <TableHead className="w-0">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((member) => {
                const isCurrentUser = member.id === currentUserId;

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {member.name}
                        {isCurrentUser ? (
                          <Badge variant="outline">{t("you")}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.capabilities.map((capability) => (
                          <Badge key={capability} variant="secondary">
                            {t(`capabilities.${CAPABILITY_LABELS[capability]}`)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setSelectedStaff(member);
                            setFormOpen(true);
                          }}
                          aria-label={tCommon("actions.edit")}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setPasswordTarget(member)}
                          aria-label={t("form.passwordTitle")}
                        >
                          <KeyRoundIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isCurrentUser}
                          onClick={() => setDeleteTarget(member)}
                          aria-label={tCommon("actions.delete")}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <StaffFormDialog
        key={selectedStaff?.id ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        staff={selectedStaff}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <StaffPasswordDialog
        open={!!passwordTarget}
        onOpenChange={(open) => !open && setPasswordTarget(null)}
        staff={passwordTarget}
        isSubmitting={passwordMutation.isPending}
        onSubmit={(values) => {
          if (!passwordTarget) {
            return;
          }

          passwordMutation.mutate({ id: passwordTarget.id, ...values });
        }}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && removeMutation.mutate({ id: deleteTarget.id })
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

export const StaffAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
};
