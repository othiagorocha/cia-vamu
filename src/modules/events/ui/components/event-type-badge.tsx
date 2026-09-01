import { Badge } from "@/components/ui/badge";
import {
  EVENT_COLOR_STYLES,
  type EventColorId,
} from "@/modules/events/event-colors";

export const EventTypeBadge = ({
  label,
  color,
}: {
  label: string;
  color: EventColorId;
}) => {
  return (
    <Badge variant="outline" className={EVENT_COLOR_STYLES[color].badge}>
      {label}
    </Badge>
  );
};
