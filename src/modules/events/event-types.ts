import type { EventColorId } from "@/modules/events/event-colors";

export type DefaultEventTypeSeed = {
  slug: string;
  label: string;
  defaultColor: EventColorId;
  isSystem: true;
  sortOrder: number;
};

export const DEFAULT_EVENT_TYPES: DefaultEventTypeSeed[] = [
  {
    slug: "teatro",
    label: "Teatro",
    defaultColor: "violet",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "viagem",
    label: "Viagem",
    defaultColor: "sky",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "evangelismo",
    label: "Evangelismo",
    defaultColor: "amber",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "visita",
    label: "Visita",
    defaultColor: "emerald",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "outro",
    label: "Outro",
    defaultColor: "slate",
    isSystem: true,
    sortOrder: 4,
  },
];

const EVENT_TYPE_SHARE_EMOJI: Record<string, string> = {
  teatro: "🎭",
  viagem: "✈️",
  evangelismo: "🙏",
  visita: "🏠",
};

export const eventTypeShareLine = (slug: string, label: string) => {
  const emoji = EVENT_TYPE_SHARE_EMOJI[slug] ?? "🏷️";
  const trimmed = label.trim();

  return trimmed ? `${emoji} ${trimmed}` : "";
};

export const slugifyEventTypeLabel = (label: string) => {
  const slug = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "tipo";
};
