"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, CopyIcon } from "lucide-react";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AccessRoleFields } from "@/modules/staff/ui/components/access-role-fields";
import {
  createInviteSchema,
  type CreateInviteInput,
} from "@/modules/staff/schema";

type CreatedInvite = {
  url: string;
};

type StaffInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting?: boolean;
  createdInvite: CreatedInvite | null;
  onCreate: (values: CreateInviteInput) => void;
};

export const StaffInviteDialog = ({
  open,
  onOpenChange,
  isSubmitting,
  createdInvite,
  onCreate,
}: StaffInviteDialogProps) => {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateInviteInput>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      accessRole: "member",
      editorModules: [],
      reusable: false,
    },
  });

  const accessRole = form.watch("accessRole");
  const editorModules = form.watch("editorModules");
  const reusable = form.watch("reusable");
  const showReusableWarning =
    reusable && (accessRole === "editor" || accessRole === "gestor");

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      accessRole: "member",
      editorModules: [],
      reusable: false,
    });
    setCopied(false);
  }, [open, form]);

  const copyLink = async () => {
    if (!createdInvite) {
      return;
    }

    await navigator.clipboard.writeText(createdInvite.url);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {createdInvite ? t("invite.createdTitle") : t("invite.title")}
          </DialogTitle>
          <DialogDescription>
            {createdInvite
              ? t("invite.createdDescription")
              : t("invite.description")}
          </DialogDescription>
        </DialogHeader>

        {createdInvite ? (
          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="invite-url">{t("invite.link")}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="invite-url"
                  readOnly
                  value={createdInvite.url}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={copyLink}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? t("invite.copied") : t("invite.copy")}
                </Button>
              </div>
            </Field>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                {tCommon("actions.close")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(onCreate)}
          >
            <FieldGroup>
              <AccessRoleFields
                accessRole={accessRole}
                modules={editorModules}
                onRoleChange={(role) =>
                  form.setValue("accessRole", role, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                onModulesChange={(modules) =>
                  form.setValue("editorModules", modules, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                modulesError={form.formState.errors.editorModules}
              />
              <Field>
                <FieldLabel>{t("invite.mode")}</FieldLabel>
                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      className="mt-1 accent-orange-400"
                      checked={!reusable}
                      onChange={() =>
                        form.setValue("reusable", false, { shouldDirty: true })
                      }
                    />
                    {t("invite.single")}
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      className="mt-1 accent-orange-400"
                      checked={reusable}
                      onChange={() =>
                        form.setValue("reusable", true, { shouldDirty: true })
                      }
                    />
                    {t("invite.reusable")}
                  </label>
                </div>
                {showReusableWarning ? (
                  <p className="text-sm text-orange-400">
                    {t("invite.reusableWarning")}
                  </p>
                ) : null}
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t("invite.generate")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
