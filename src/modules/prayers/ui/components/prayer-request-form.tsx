"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import {
  prayerRequestFormSchema,
  type PrayerRequestFormInput,
} from "@/modules/prayers/schema";
import { trpc } from "@/trpc/client";

type PrayerRequestFormProps = {
  onSuccess?: () => void;
};

const emptyValues: PrayerRequestFormInput = {
  body: "",
  isAnonymous: false,
  name: "",
  email: "",
};

export const PrayerRequestForm = ({ onSuccess }: PrayerRequestFormProps) => {
  const t = useTranslations("prayers");
  const { data: session } = useSession();

  const form = useForm<PrayerRequestFormInput>({
    resolver: zodResolver(prayerRequestFormSchema),
    defaultValues: emptyValues,
  });

  const isAnonymous = useWatch({
    control: form.control,
    name: "isAnonymous",
  });

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    if (!form.getValues("name")) {
      form.setValue("name", session.user.name);
    }

    if (!form.getValues("email") && session.user.email) {
      form.setValue("email", session.user.email);
    }
  }, [form, session]);

  const createMutation = trpc.prayers.create.useMutation({
    onSuccess: () => {
      toast.success(t("success"));
      form.reset({
        ...emptyValues,
        name: session?.user.name ?? "",
        email: session?.user.email ?? "",
      });
      onSuccess?.();
    },
    onError: () => {
      toast.error(t("error"));
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      className="space-y-6"
      noValidate
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="body"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="prayer-body">{t("fields.body")}</FieldLabel>
              <Textarea
                {...field}
                id="prayer-body"
                rows={5}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
                {t("fields.anonymous")}
              </label>
            </Field>
          )}
        />

        {!isAnonymous ? (
          <>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="prayer-name">
                    {t("fields.name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="prayer-name"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="prayer-email">
                    {t("fields.email")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="prayer-email"
                    type="email"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        ) : null}
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending && <Loader2Icon className="animate-spin" />}
        {t("submit")}
      </Button>
    </form>
  );
};
