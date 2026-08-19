"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CopyIcon,
  KeyRoundIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PhotoExpandDialog } from "@/components/photo-expand-dialog";
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
import { formatBrazilDateTimeShort } from "@/lib/brazil-datetime";
import type { EditorCapability } from "@/lib/permissions";
import { useToastError } from "@/lib/use-toast-error";
import {
  editorModulesFromCapabilities,
  roleFromCapabilities,
} from "@/lib/permissions";
import { StaffFormDialog } from "@/modules/staff/ui/components/staff-form-dialog";
import { StaffInviteDialog } from "@/modules/staff/ui/components/staff-invite-dialog";
import { StaffInviteUsesDialog } from "@/modules/staff/ui/components/staff-invite-uses-dialog";
import { StaffPasswordDialog } from "@/modules/staff/ui/components/staff-password-dialog";
import type {
  CreateInviteInput,
  StaffFormInput,
  UpdateStaffFormInput,
} from "@/modules/staff/schema";
import type { StaffRecord } from "@/modules/staff/types";
import { trpc } from "@/trpc/client";

const MODULE_LABELS: Record<EditorCapability, "events" | "albums" | "site"> = {
  "events:write": "events",
  "albums:write": "albums",
  "site:write": "site",
};

type StaffAdminViewProps = {
  currentUserId: string;
};

export const StaffAdminView = ({ currentUserId }: StaffAdminViewProps) => {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [staffList] = trpc.staff.list.useSuspenseQuery();
  const [inviteList] = trpc.staff.listInvites.useSuspenseQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [usesInviteId, setUsesInviteId] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{ url: string } | null>(
    null,
  );
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<StaffRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const invalidate = () => {
    utils.staff.list.invalidate();
    utils.staff.listInvites.invalidate();
  };

  const createMutation = trpc.staff.create.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const updateMutation = trpc.staff.update.useMutation({
    onSuccess: () => {
      toast.success(t("updated"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const passwordMutation = trpc.staff.setPassword.useMutation({
    onSuccess: () => {
      toast.success(t("passwordUpdated"));
      setPasswordTarget(null);
    },
    onError: toastError,
  });

  const disableMutation = trpc.staff.setDisabled.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });

  const removeMutation = trpc.staff.remove.useMutation({
    onSuccess: () => {
      toast.success(t("removed"));
      setDeleteTarget(null);
      invalidate();
    },
    onError: toastError,
  });

  const createInviteMutation = trpc.staff.createInvite.useMutation({
    onSuccess: (invite) => {
      toast.success(t("invite.created"));
      setCreatedInvite({ url: invite.url });
      invalidate();
    },
    onError: toastError,
  });

  const revokeInviteMutation = trpc.staff.revokeInvite.useMutation({
    onSuccess: () => {
      toast.success(t("invite.revoked"));
      invalidate();
    },
    onError: toastError,
  });

  const revealInviteMutation = trpc.staff.revealInvite.useMutation({
    onSuccess: async (invite) => {
      await navigator.clipboard.writeText(invite.url);
      toast.success(t("invite.copied"));
    },
    onError: toastError,
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCreatedInvite(null);
              setInviteOpen(true);
            }}
          >
            <LinkIcon />
            {t("invite.button")}
          </Button>
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
                <TableHead>{t("columns.member")}</TableHead>
                <TableHead>{t("columns.lastAccess")}</TableHead>
                <TableHead className="w-0">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const isSuperAdmin = member.isSuperAdmin;
                const canMutateAccess = !isCurrentUser && !isSuperAdmin;

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {member.photoUrl ? (
                          <button
                            type="button"
                            className="size-10 shrink-0 overflow-hidden rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              setExpandedPhoto({
                                src: member.photoUrl!,
                                alt: member.name,
                              });
                            }}
                            aria-label={t("expandPhoto", { name: member.name })}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={member.photoUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          </button>
                        ) : (
                          <div
                            aria-hidden
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
                          >
                            {member.name.trim().charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          {member.name}
                          {isCurrentUser ? (
                            <Badge variant="outline">{t("you")}</Badge>
                          ) : null}
                          {isSuperAdmin ? (
                            <Badge className="bg-orange-400 text-black hover:bg-orange-400">
                              {t("superAdmin")}
                            </Badge>
                          ) : null}
                          {member.disabled ? (
                            <Badge variant="secondary">{t("deactivated")}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">
                          {t(`roles.${roleFromCapabilities(member.capabilities)}`)}
                        </Badge>
                        {roleFromCapabilities(member.capabilities) === "editor"
                          ? editorModulesFromCapabilities(member.capabilities).map(
                              (capability) => (
                                <Badge key={capability} variant="outline">
                                  {t(`capabilities.${MODULE_LABELS[capability]}`)}
                                </Badge>
                              ),
                            )
                          : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.isMember ? "default" : "secondary"}>
                        {member.isMember ? t("yes") : t("no")}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {member.lastAccessAt ? (
                        <span title={formatBrazilDateTimeShort(member.lastAccessAt)}>
                          {formatDistanceToNow(member.lastAccessAt, {
                            locale: ptBR,
                            addSuffix: true,
                          })}
                        </span>
                      ) : (
                        t("lastAccessNever")
                      )}
                    </TableCell>
                    <TableCell>
                      {isSuperAdmin ? null : (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
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
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setPasswordTarget(member)}
                            aria-label={t("form.passwordTitle")}
                          >
                            <KeyRoundIcon className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!canMutateAccess}
                            onClick={() => {
                              disableMutation.mutate({
                                id: member.id,
                                disabled: !member.disabled,
                              });
                            }}
                          >
                            {member.disabled ? t("reactivate") : t("deactivate")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={!canMutateAccess}
                            onClick={() => setDeleteTarget(member)}
                            aria-label={tCommon("actions.delete")}
                          >
                            <Trash2Icon className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("invite.pendingTitle")}
        </h2>
        {inviteList.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("invite.empty")}</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invite.roleColumn")}</TableHead>
                  <TableHead>{t("invite.modeColumn")}</TableHead>
                  <TableHead>{t("invite.expiresColumn")}</TableHead>
                  <TableHead className="w-0">{t("columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inviteList.map((invite) => {
                  const role = roleFromCapabilities(invite.capabilities);
                  const reusable = invite.maxUses !== 1;

                  return (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{t(`roles.${role}`)}</Badge>
                        {role === "editor"
                          ? editorModulesFromCapabilities(invite.capabilities).map(
                              (capability) => (
                                <Badge key={capability} variant="outline">
                                  {t(`capabilities.${MODULE_LABELS[capability]}`)}
                                </Badge>
                              ),
                            )
                          : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>
                          {reusable ? t("invite.reusable") : t("invite.single")}
                        </span>
                        {reusable ? (
                          invite.usedCount > 0 ? (
                            <button
                              type="button"
                              className="w-fit text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
                              onClick={() => setUsesInviteId(invite.id)}
                              aria-label={t("invite.viewUses")}
                            >
                              {t("invite.uses", { count: invite.usedCount })}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("invite.uses", { count: invite.usedCount })}
                            </span>
                          )
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.expiresAt
                        ? t("invite.expires", {
                            when: formatDistanceToNow(invite.expiresAt, {
                              locale: ptBR,
                              addSuffix: true,
                            }),
                          })
                        : t("invite.noExpiry")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            revealInviteMutation.mutate({ id: invite.id })
                          }
                          aria-label={t("invite.copyAgain")}
                        >
                          <CopyIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            revokeInviteMutation.mutate({ id: invite.id })
                          }
                        >
                          {t("invite.revoke")}
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
      </div>

      <PhotoExpandDialog
        src={expandedPhoto?.src ?? null}
        alt={expandedPhoto?.alt ?? ""}
        onClose={() => setExpandedPhoto(null)}
      />

      <StaffFormDialog
        key={selectedStaff?.id ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        staff={selectedStaff}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <StaffInviteDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setCreatedInvite(null);
          }
        }}
        isSubmitting={createInviteMutation.isPending}
        createdInvite={createdInvite}
        onCreate={(values: CreateInviteInput) =>
          createInviteMutation.mutate(values)
        }
      />

      <StaffInviteUsesDialog
        inviteId={usesInviteId}
        open={Boolean(usesInviteId)}
        onOpenChange={(open) => {
          if (!open) {
            setUsesInviteId(null);
          }
        }}
      />

      <StaffPasswordDialog
        open={!!passwordTarget}
        onOpenChange={(open) => !open && setPasswordTarget(null)}
        staff={passwordTarget}
        isSubmitting={passwordMutation.isPending}
        onSubmit={(values) => {
          if (!passwordTarget || passwordTarget.isSuperAdmin) {
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
