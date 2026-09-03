import type { EventColorId } from "@/modules/events/event-colors";

export const DEFAULT_EVENT_TYPE_EMOJI = "🏷️";

export const EVENT_TYPE_EMOJI_SUGGESTIONS = [
  "🎭",
  "✈️",
  "🙏",
  "🏠",
  "🏷️",
  "📅",
  "🎤",
  "⛪",
  "🚌",
  "🎉",
  "⭐",
  "📖",
] as const;

export type DefaultEventTypeSeed = {
  slug: string;
  label: string;
  emoji: string;
  defaultColor: EventColorId;
  isSystem: true;
  sortOrder: number;
};

export const DEFAULT_EVENT_TYPES: DefaultEventTypeSeed[] = [
  {
    slug: "teatro",
    label: "Teatro",
    emoji: "🎭",
    defaultColor: "violet",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "viagem",
    label: "Viagem",
    emoji: "✈️",
    defaultColor: "sky",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "evangelismo",
    label: "Evangelismo",
    emoji: "🙏",
    defaultColor: "amber",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "visita",
    label: "Visita",
    emoji: "🏠",
    defaultColor: "emerald",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "outro",
    label: "Outro",
    emoji: DEFAULT_EVENT_TYPE_EMOJI,
    defaultColor: "slate",
    isSystem: true,
    sortOrder: 4,
  },
];

const graphemeSegmenter = new Intl.Segmenter("pt-BR", {
  granularity: "grapheme",
});

const graphemesOf = (value: string) =>
  [...graphemeSegmenter.segment(value)].map((part) => part.segment);

export const countEventTypeGraphemes = (value: string) =>
  graphemesOf(value).length;

export const lastEventTypeGrapheme = (value: string) => {
  const graphemes = graphemesOf(value.trim());
  return graphemes.at(-1) ?? "";
};

export const normalizeEventTypeEmoji = (emoji: string | null | undefined) => {
  const trimmed = emoji?.trim() ?? "";
  return trimmed || DEFAULT_EVENT_TYPE_EMOJI;
};

export const eventTypeShareLine = (emoji: string, label: string) => {
  const mark = normalizeEventTypeEmoji(emoji);
  const trimmed = label.trim();

  return trimmed ? `${mark} ${trimmed}` : "";
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
