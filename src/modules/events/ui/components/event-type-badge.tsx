import { Badge } from "@/components/ui/badge";
import {
  EVENT_COLOR_STYLES,
  type EventColorId,
} from "@/modules/events/event-colors";
import { eventTypeShareLine } from "@/modules/events/event-types";

export const EventTypeBadge = ({
  label,
  emoji,
  color,
}: {
  label: string;
  emoji: string;
  color: EventColorId;
}) => {
  return (
    <Badge variant="outline" className={EVENT_COLOR_STYLES[color].badge}>
      {eventTypeShareLine(emoji, label)}
    </Badge>
  );
};
