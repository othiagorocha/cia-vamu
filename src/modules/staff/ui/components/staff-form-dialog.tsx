"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  capabilitiesFromRole,
  editorModulesFromCapabilities,
  roleFromCapabilities,
} from "@/lib/permissions";
import { AccessRoleFields } from "@/modules/staff/ui/components/access-role-fields";
import {
  getStaffDialogSchema,
  type StaffDialogInput,
  type StaffFormInput,
  type UpdateStaffFormInput,
} from "@/modules/staff/schema";
import type { StaffRecord } from "@/modules/staff/types";

type StaffFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffRecord | null;
  isSubmitting?: boolean;
  onCreate: (values: StaffFormInput) => void;
  onUpdate: (values: UpdateStaffFormInput) => void;
};

export const StaffFormDialog = ({
  open,
  onOpenChange,
  staff,
  isSubmitting,
  onCreate,
  onUpdate,
}: StaffFormDialogProps) => {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const isEditing = Boolean(staff);

  const form = useForm<StaffDialogInput>({
    resolver: zodResolver(getStaffDialogSchema(isEditing)),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      accessRole: "member",
      editorModules: [],
      role: "",
      isMember: false,
      showOnAbout: false,
    },
  });

  const accessRole = form.watch("accessRole");
  const editorModules = form.watch("editorModules");

  useEffect(() => {
    if (!open) {
      return;
    }

    const capabilities = staff?.capabilities ?? [];

    form.reset({
      name: staff?.name ?? "",
      email: staff?.email ?? "",
      password: "",
      accessRole: roleFromCapabilities(capabilities),
      editorModules: editorModulesFromCapabilities(capabilities),
      role: staff?.role ?? "",
      isMember: staff?.isMember ?? false,
      showOnAbout: staff?.showOnAbout ?? false,
    });
  }, [open, staff, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("form.editTitle") : t("form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("form.editDescription") : t("form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => {
            const capabilities = capabilitiesFromRole(
              values.accessRole,
              values.editorModules,
            );

            if (isEditing) {
              onUpdate({
                name: values.name,
                capabilities,
                role: values.role,
                isMember: values.isMember,
                showOnAbout: values.showOnAbout,
              });
              return;
            }

            onCreate({
              name: values.name,
              email: values.email,
              password: values.password,
              capabilities,
            });
          })}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="staff-name">{t("form.name")}</FieldLabel>
              <Input id="staff-name" autoComplete="name" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            {!isEditing ? (
              <>
                <Field data-invalid={Boolean(form.formState.errors.email)}>
                  <FieldLabel htmlFor="staff-email">{t("form.email")}</FieldLabel>
                  <Input
                    id="staff-email"
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                  />
                  <FieldError errors={[form.formState.errors.email]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.password)}>
                  <FieldLabel htmlFor="staff-password">{t("form.password")}</FieldLabel>
                  <Input
                    id="staff-password"
                    type="password"
                    autoComplete="new-password"
                    {...form.register("password")}
                  />
                  <FieldError errors={[form.formState.errors.password]} />
                </Field>
              </>
            ) : null}

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
              <FieldLabel htmlFor="staff-role">{t("role")}</FieldLabel>
              <Input id="staff-role" {...form.register("role")} />
            </Field>
            <Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("isMember")} />
                {t("isMember")}
              </label>
            </Field>
            <Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("showOnAbout")} />
                {t("showOnAbout")}
              </label>
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
              {tCommon("actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
