"use client";

import { useState } from "react";
import Link from "next/link";
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
import { authClient } from "@/lib/auth-client";
import { cropPhotoToSquare, type PhotoFrame } from "@/lib/crop-photo";
import { hardNavigate } from "@/lib/hard-navigate";
import { useToastError } from "@/lib/use-toast-error";
import {
  PROFILE_PHOTO_VIEWPORT,
  ProfilePhotoEditor,
} from "@/modules/members/ui/components/profile-photo-editor";
import {
  acceptInviteFormSchema,
  type AcceptInviteFormInput,
} from "@/modules/staff/schema";
import { trpc } from "@/trpc/client";

const DEFAULT_FRAME: PhotoFrame = { offsetX: 0, offsetY: 0, zoom: 1 };

export const InviteView = ({ token }: { token: string }) => {
  const t = useTranslations("auth.invite");
  const tLogin = useTranslations("auth.login");
  const toastError = useToastError();
  const inviteQuery = trpc.staff.getInvite.useQuery({ token });
  const [isPending, setIsPending] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [frame, setFrame] = useState<PhotoFrame>(DEFAULT_FRAME);

  const form = useForm<AcceptInviteFormInput>({
    resolver: zodResolver(acceptInviteFormSchema),
    defaultValues: {
      token,
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const acceptMutation = trpc.staff.acceptInvite.useMutation({
    onError: toastError,
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
          <CardHeader className="justify-items-center text-center">
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

  const onSubmit = async (values: AcceptInviteFormInput) => {
    setIsPending(true);

    let photo = values.photo;

    if (source) {
      try {
        photo = await cropPhotoToSquare(
          source,
          frame,
          PROFILE_PHOTO_VIEWPORT,
        );
      } catch {
        toast.error(t("photoCropError"));
        setIsPending(false);
        return;
      }
    }

    try {
      await acceptMutation.mutateAsync({
        token,
        name: values.name,
        email: values.email,
        password: values.password,
        photo,
      });
    } catch {
      setIsPending(false);
      return;
    }

    await authClient.signIn.email(
      {
        email: values.email.toLowerCase().trim(),
        password: values.password,
      },
      {
        onSuccess: () => {
          toast.success(t("success"));
          hardNavigate("/admin");
        },
        onError: (ctx) => {
          toastError({
            message: ctx.error.message,
            code: ctx.error.code,
            status: ctx.error.status,
          });
          hardNavigate("/admin/login");
        },
      },
    );

    setIsPending(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="justify-items-center text-center">
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
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-medium">{t("photo")}</span>
                <ProfilePhotoEditor
                  align="center"
                  source={source}
                  savedUrl={null}
                  frame={frame}
                  onFrameChange={setFrame}
                  onFile={(dataUrl) => {
                    setSource(dataUrl);
                    setFrame(DEFAULT_FRAME);
                    form.setValue("photo", dataUrl, { shouldDirty: true });
                  }}
                  onRemove={
                    source
                      ? () => {
                          setSource(null);
                          setFrame(DEFAULT_FRAME);
                          form.setValue("photo", undefined, {
                            shouldDirty: true,
                          });
                        }
                      : undefined
                  }
                />
                {!source ? (
                  <p className="max-w-64 text-center text-xs text-muted-foreground">
                    {t("photoHint")}
                  </p>
                ) : null}
              </div>
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
              <Controller
                control={form.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invite-confirm-password">
                      {t("confirmPassword")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="invite-confirm-password"
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
