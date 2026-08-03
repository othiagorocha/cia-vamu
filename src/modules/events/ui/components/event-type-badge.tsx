import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { EventType } from "@/modules/events/types";

export const EventTypeBadge = ({ type }: { type: EventType }) => {
  const t = useTranslations("events.types");

  return (
    <Badge
      variant="outline"
      className="border-orange-400/40 bg-orange-400/10 text-orange-600 dark:text-orange-400"
    >
      {t(type)}
    </Badge>
  );
};
