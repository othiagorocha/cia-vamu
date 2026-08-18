"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSocialIcon, OTHER_ICON_OPTIONS } from "@/modules/social/icons";
import {
  socialLinkFormSchema,
  socialPlatforms,
  type SocialLinkFormInput,
} from "@/modules/social/schema";
import type { SocialLinkRecord } from "@/modules/social/types";
import { trpc } from "@/trpc/client";
import { useToastError } from "@/lib/use-toast-error";

export const SocialAdminView = () => {
  const t = useTranslations("social");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [links] = trpc.social.listAll.useSuspenseQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<SocialLinkRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SocialLinkRecord | null>(
    null,
  );
  const [iconQuery, setIconQuery] = useState("");

  const form = useForm<SocialLinkFormInput>({
    resolver: zodResolver(socialLinkFormSchema),
    defaultValues: {
      platform: "instagram",
      label: "",
      url: "",
      iconName: "Globe",
      published: true,
    },
  });

  const platform = form.watch("platform");

  useEffect(() => {
    if (!formOpen) {
      return;
    }

    form.reset({
      platform: selected?.platform ?? "instagram",
      label: selected?.label ?? "",
      url: selected?.url ?? "",
      iconName: selected?.iconName ?? "Globe",
      published: selected?.published ?? true,
    });
    setIconQuery("");
  }, [formOpen, selected, form]);

  const filteredIcons = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();
    if (!query) {
      return OTHER_ICON_OPTIONS;
    }

    return OTHER_ICON_OPTIONS.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [iconQuery]);

  const invalidate = () => {
    utils.social.listAll.invalidate();
    utils.social.listPublished.invalidate();
  };

  const createMutation = trpc.social.create.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const updateMutation = trpc.social.update.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      setFormOpen(false);
      invalidate();
    },
    onError: toastError,
  });

  const removeMutation = trpc.social.remove.useMutation({
    onSuccess: () => {
      toast.success(t("removed"));
      setDeleteTarget(null);
      invalidate();
    },
    onError: toastError,
  });

  const reorderMutation = trpc.social.reorder.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setSelected(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon />
          {t("new")}
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.label")}</TableHead>
                <TableHead>{t("columns.platform")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-0">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const Icon = getSocialIcon(link.platform, link.iconName);

                return (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="size-4" />
                        {link.label}
                      </span>
                    </TableCell>
                    <TableCell>{t(`platforms.${link.platform}`)}</TableCell>
                    <TableCell>
                      <Badge variant={link.published ? "default" : "secondary"}>
                        {link.published ? t("published") : t("draft")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            reorderMutation.mutate({
                              id: link.id,
                              direction: "up",
                            })
                          }
                          aria-label={t("moveUp")}
                        >
                          <ArrowUpIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            reorderMutation.mutate({
                              id: link.id,
                              direction: "down",
                            })
                          }
                          aria-label={t("moveDown")}
                        >
                          <ArrowDownIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setSelected(link);
                            setFormOpen(true);
                          }}
                          aria-label={tCommon("actions.edit")}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(link)}
                          aria-label={tCommon("actions.delete")}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected ? t("form.editTitle") : t("form.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => {
              if (selected) {
                updateMutation.mutate({ id: selected.id, data: values });
                return;
              }

              createMutation.mutate(values);
            })}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="social-platform">
                  {t("form.platform")}
                </FieldLabel>
                <select
                  id="social-platform"
                  className="h-9 rounded-lg border bg-background px-3 text-sm"
                  {...form.register("platform")}
                >
                  {socialPlatforms.map((item) => (
                    <option key={item} value={item}>
                      {t(`platforms.${item}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.label)}>
                <FieldLabel htmlFor="social-label">{t("form.label")}</FieldLabel>
                <Input id="social-label" {...form.register("label")} />
                <FieldError errors={[form.formState.errors.label]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.url)}>
                <FieldLabel htmlFor="social-url">{t("form.url")}</FieldLabel>
                <Input id="social-url" type="url" {...form.register("url")} />
                <FieldError errors={[form.formState.errors.url]} />
              </Field>
              {platform === "other" ? (
                <Field>
                  <FieldLabel>{t("form.icon")}</FieldLabel>
                  <Input
                    value={iconQuery}
                    onChange={(event) => setIconQuery(event.target.value)}
                    placeholder={t("form.iconSearch")}
                  />
                  <div className="grid max-h-40 grid-cols-5 gap-2 overflow-auto pt-2">
                    {filteredIcons.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        className="flex flex-col items-center gap-1 rounded-lg border p-2 text-xs hover:bg-muted"
                        onClick={() => form.setValue("iconName", item.name)}
                      >
                        <item.icon className="size-4" />
                        {item.name}
                      </button>
                    ))}
                  </div>
                </Field>
              ) : null}
              <Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...form.register("published")} />
                  {t("form.published")}
                </label>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                {tCommon("actions.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {tCommon("actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { name: deleteTarget?.label ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && removeMutation.mutate({ id: deleteTarget.id })
              }
            >
              {tCommon("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const SocialAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
};
