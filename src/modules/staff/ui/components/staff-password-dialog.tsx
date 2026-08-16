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
  setStaffPasswordFormSchema,
  type SetStaffPasswordFormInput,
} from "@/modules/staff/schema";
import type { StaffRecord } from "@/modules/staff/types";

type StaffPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffRecord | null;
  isSubmitting?: boolean;
  onSubmit: (values: SetStaffPasswordFormInput) => void;
};

export const StaffPasswordDialog = ({
  open,
  onOpenChange,
  staff,
  isSubmitting,
  onSubmit,
}: StaffPasswordDialogProps) => {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");

  const form = useForm<SetStaffPasswordFormInput>({
    resolver: zodResolver(setStaffPasswordFormSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ password: "" });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("form.passwordTitle")}</DialogTitle>
          <DialogDescription>
            {t("form.passwordDescription", { name: staff?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.password)}>
              <FieldLabel htmlFor="staff-new-password">{t("form.password")}</FieldLabel>
              <Input
                id="staff-new-password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              <FieldError errors={[form.formState.errors.password]} />
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
