"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { useToastError } from "@/lib/use-toast-error";
import {
  changeOwnPasswordSchema,
  type ChangeOwnPasswordInput,
} from "@/modules/auth/schema";
import { trpc } from "@/trpc/client";

type ForcePasswordChangeDialogProps = {
  required: boolean;
};

export const ForcePasswordChangeDialog = ({
  required,
}: ForcePasswordChangeDialogProps) => {
  const t = useTranslations("auth.changePassword");
  const toastError = useToastError();
  const router = useRouter();
  const [completed, setCompleted] = useState(false);

  const form = useForm<ChangeOwnPasswordInput>({
    resolver: zodResolver(changeOwnPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (required) {
      form.reset({ password: "", confirmPassword: "" });
    }
  }, [required, form]);

  const mutation = trpc.auth.changeOwnPassword.useMutation({
    onSuccess: () => {
      toast.success(t("success"));
      setCompleted(true);
      router.refresh();
    },
    onError: toastError,
  });

  return (
    <Dialog open={required && !completed} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.password)}>
              <FieldLabel htmlFor="own-new-password">{t("password")}</FieldLabel>
              <Input
                id="own-new-password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              <FieldError errors={[form.formState.errors.password]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
              <FieldLabel htmlFor="own-confirm-password">
                {t("confirmPassword")}
              </FieldLabel>
              <Input
                id="own-confirm-password"
                type="password"
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              <FieldError errors={[form.formState.errors.confirmPassword]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
