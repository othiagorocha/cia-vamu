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
import { SITE_CAPABILITIES, type SiteCapability } from "@/lib/permissions";
import {
  getStaffDialogSchema,
  type StaffDialogInput,
  type StaffFormInput,
  type UpdateStaffFormInput,
} from "@/modules/staff/schema";
import type { StaffRecord } from "@/modules/staff/types";

const CAPABILITY_LABELS: Record<SiteCapability, "events" | "albums" | "users"> = {
  "events:write": "events",
  "albums:write": "albums",
  "users:manage": "users",
};

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
      capabilities: [],
    },
  });

  const capabilities = form.watch("capabilities");

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      name: staff?.name ?? "",
      email: staff?.email ?? "",
      password: "",
      capabilities: staff?.capabilities ?? [],
    });
  }, [open, staff, form]);

  const toggleCapability = (capability: SiteCapability, checked: boolean) => {
    const next = checked
      ? [...capabilities, capability]
      : capabilities.filter((item) => item !== capability);

    form.setValue("capabilities", next, { shouldValidate: true, shouldDirty: true });
  };

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
            if (isEditing) {
              onUpdate({
                name: values.name,
                capabilities: values.capabilities,
              });
              return;
            }

            onCreate(values as StaffFormInput);
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

            <Field data-invalid={Boolean(form.formState.errors.capabilities)}>
              <FieldLabel>{t("form.permissions")}</FieldLabel>
              <p className="text-sm text-muted-foreground">{t("form.permissionsHint")}</p>
              <div className="flex flex-col gap-2">
                {SITE_CAPABILITIES.map((capability) => (
                  <label
                    key={capability}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-orange-400"
                      checked={capabilities.includes(capability)}
                      onChange={(event) =>
                        toggleCapability(capability, event.target.checked)
                      }
                    />
                    {t(`capabilities.${CAPABILITY_LABELS[capability]}`)}
                  </label>
                ))}
              </div>
              <FieldError errors={[form.formState.errors.capabilities]} />
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
