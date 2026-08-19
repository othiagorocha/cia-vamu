"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const nameSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(255),
});

type NameInput = z.infer<typeof nameSchema>;

type DocumentsNameDialogProps = {
  open: boolean;
  title: string;
  label: string;
  initialName?: string;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
};

export const DocumentsNameDialog = ({
  open,
  title,
  label,
  initialName = "",
  isSubmitting,
  onOpenChange,
  onSubmit,
}: DocumentsNameDialogProps) => {
  const tCommon = useTranslations("common");
  const form = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: initialName },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: initialName });
    }
  }, [form, initialName, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => onSubmit(values.name.trim()))}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="document-name">{label}</FieldLabel>
              <Input id="document-name" autoFocus {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
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
