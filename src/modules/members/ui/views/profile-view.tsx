"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cropPhotoToSquare, type PhotoFrame } from "@/lib/crop-photo";
import {
  updateMyProfileSchema,
  type UpdateMyProfileInput,
} from "@/modules/members/schema";
import {
  PROFILE_PHOTO_VIEWPORT,
  ProfilePhotoEditor,
} from "@/modules/members/ui/components/profile-photo-editor";
import { trpc } from "@/trpc/client";

const DEFAULT_FRAME: PhotoFrame = { offsetX: 0, offsetY: 0, zoom: 1 };

export const ProfileView = () => {
  const t = useTranslations("staff.profile");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const [me] = trpc.members.getMe.useSuspenseQuery();
  const [source, setSource] = useState<string | null>(null);
  const [frame, setFrame] = useState<PhotoFrame>(DEFAULT_FRAME);

  const form = useForm<UpdateMyProfileInput>({
    resolver: zodResolver(updateMyProfileSchema),
    defaultValues: {
      name: me?.name ?? "",
      testimony: me?.testimony ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      name: me?.name ?? "",
      testimony: me?.testimony ?? "",
    });
    setSource(null);
    setFrame(DEFAULT_FRAME);
  }, [me, form]);

  const mutation = trpc.members.updateMe.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      setSource(null);
      setFrame(DEFAULT_FRAME);
      utils.members.getMe.invalidate();
      utils.staff.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          const cropSource = source ?? me?.photoUrl ?? null;
          const frameChanged =
            frame.offsetX !== 0 || frame.offsetY !== 0 || frame.zoom !== 1;

          let photo = values.photo;

          if (cropSource && (source || frameChanged)) {
            try {
              photo = await cropPhotoToSquare(
                cropSource,
                frame,
                PROFILE_PHOTO_VIEWPORT,
              );
            } catch {
              toast.error(t("photoCropError"));
              return;
            }
          }

          mutation.mutate({ ...values, photo });
        })}
      >
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="profile-name">{t("name")}</FieldLabel>
            <Input id="profile-name" {...form.register("name")} />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>
          {me?.role ? (
            <Field>
              <FieldLabel>{t("role")}</FieldLabel>
              <Input value={me.role} disabled />
            </Field>
          ) : null}
          <Field>
            <FieldLabel>{t("photo")}</FieldLabel>
            <ProfilePhotoEditor
              source={source}
              savedUrl={me?.photoUrl ?? null}
              frame={frame}
              onFrameChange={setFrame}
              onFile={(dataUrl) => {
                setSource(dataUrl);
                setFrame(DEFAULT_FRAME);
                form.setValue("photo", dataUrl, { shouldDirty: true });
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-testimony">{t("testimony")}</FieldLabel>
            <Textarea
              id="profile-testimony"
              rows={5}
              {...form.register("testimony")}
            />
          </Field>
        </FieldGroup>
        <Button type="submit" disabled={mutation.isPending}>
          {tCommon("actions.save")}
        </Button>
      </form>
    </div>
  );
};

export const ProfileViewSkeleton = () => {
  return <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />;
};
