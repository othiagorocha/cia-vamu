import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  EVENT_COLOR_STYLES,
  EVENT_TYPE_DEFAULT_COLOR,
  type EventColorId,
} from "@/modules/events/event-colors";
import type { EventType } from "@/modules/events/types";

export const EventTypeBadge = ({
  type,
  color,
}: {
  type: EventType;
  color?: EventColorId;
}) => {
  const t = useTranslations("events.types");
  const resolved = color ?? EVENT_TYPE_DEFAULT_COLOR[type];

  return (
    <Badge variant="outline" className={EVENT_COLOR_STYLES[resolved].badge}>
      {t(type)}
    </Badge>
  );
};
