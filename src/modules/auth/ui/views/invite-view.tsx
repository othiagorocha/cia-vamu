"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  acceptInviteSchema,
  type AcceptInviteInput,
} from "@/modules/staff/schema";
import { trpc } from "@/trpc/client";

export const InviteView = ({ token }: { token: string }) => {
  const t = useTranslations("auth.invite");
  const tLogin = useTranslations("auth.login");
  const router = useRouter();
  const inviteQuery = trpc.staff.getInvite.useQuery({ token });
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { token, name: "", email: "", password: "" },
  });

  const acceptMutation = trpc.staff.acceptInvite.useMutation({
    onSuccess: () => {
      toast.success(t("success"));
      router.push("/admin/login");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setIsPending(false),
  });

  if (inviteQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (inviteQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <Logo variant="white" className="mb-2 size-16" priority />
            <CardTitle className="text-2xl font-semibold">{t("invalidTitle")}</CardTitle>
            <CardDescription>{t("invalidDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/admin/login">{tLogin("submit")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = (values: AcceptInviteInput) => {
    setIsPending(true);
    acceptMutation.mutate({ ...values, token });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo variant="white" className="mb-2 size-16" priority />
          <CardTitle className="text-2xl font-semibold">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <FieldGroup>
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invite-name">{t("name")}</FieldLabel>
                    <Input
                      {...field}
                      id="invite-name"
                      autoComplete="name"
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
                    <FieldLabel htmlFor="invite-email">{t("email")}</FieldLabel>
                    <Input
                      {...field}
                      id="invite-email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@ciavamu.com"
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
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invite-password">{t("password")}</FieldLabel>
                    <Input
                      {...field}
                      id="invite-password"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
