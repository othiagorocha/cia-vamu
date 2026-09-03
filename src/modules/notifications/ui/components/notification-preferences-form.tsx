"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { useToastError } from "@/lib/use-toast-error";
import type { NotificationPreferenceGroup } from "@/modules/notifications/notification-types";
import { trpc } from "@/trpc/client";

const GROUP_ORDER: NotificationPreferenceGroup[] = [
  "personal",
  "team",
  "public",
];

export const NotificationPreferencesForm = () => {
  const t = useTranslations("notifications");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [preferences] = trpc.notifications.getPreferences.useSuspenseQuery();

  const updateMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success(t("preferencesSaved"));
      void utils.notifications.getPreferences.invalidate();
    },
    onError: toastError,
  });

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: preferences.items.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {t("preferencesTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("preferencesSubtitle")}
        </p>
      </div>
      <div className="flex flex-col gap-6">
        {grouped.map((section) => (
          <div key={section.group} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t(`groups.${section.group}`)}
            </h3>
            <ul className="flex flex-col gap-3 rounded-lg border p-3">
              {section.items.map((item) => {
                const switchId = `notification-pref-${item.type}`;

                return (
                  <li
                    key={item.type}
                    className="flex items-center justify-between gap-3"
                  >
                    <label
                      htmlFor={switchId}
                      className="min-w-0 flex-1 text-sm leading-snug"
                    >
                      {t(`types.${item.type}`)}
                    </label>
                    <Switch
                      id={switchId}
                      checked={item.enabled}
                      disabled={updateMutation.isPending}
                      onCheckedChange={(enabled) => {
                        updateMutation.mutate({ type: item.type, enabled });
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export const NotificationPreferencesFormSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-7 w-40 animate-pulse rounded bg-muted/60" />
      <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
    </div>
  );
};
