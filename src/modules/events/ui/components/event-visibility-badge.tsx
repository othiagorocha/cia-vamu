"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export const EventVisibilityBadge = ({
  published,
}: {
  published: boolean;
}) => {
  const t = useTranslations("events.visibility");

  return (
    <Badge variant={published ? "default" : "secondary"}>
      {published ? t("public") : t("team")}
    </Badge>
  );
};
