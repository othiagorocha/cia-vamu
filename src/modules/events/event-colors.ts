export const EVENT_COLOR_IDS = [
  "amber",
  "sky",
  "emerald",
  "rose",
  "violet",
  "slate",
  "orange",
] as const;

export type EventColorId = (typeof EVENT_COLOR_IDS)[number];

export const EVENT_TYPE_DEFAULT_COLOR: Record<
  "teatro" | "viagem" | "evangelismo" | "outro",
  EventColorId
> = {
  teatro: "violet",
  viagem: "sky",
  evangelismo: "amber",
  outro: "slate",
};

export const EVENT_COLOR_STYLES: Record<
  EventColorId,
  {
    card: string;
    bar: string;
    swatch: string;
    badge: string;
    dot: string;
  }
> = {
  amber: {
    card: "bg-amber-500/10 ring-amber-400/30",
    bar: "bg-amber-400",
    swatch: "bg-amber-400",
    badge:
      "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  sky: {
    card: "bg-sky-500/10 ring-sky-400/30",
    bar: "bg-sky-400",
    swatch: "bg-sky-400",
    badge: "border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400",
    dot: "bg-sky-400",
  },
  emerald: {
    card: "bg-emerald-500/10 ring-emerald-400/30",
    bar: "bg-emerald-400",
    swatch: "bg-emerald-400",
    badge:
      "border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-400",
  },
  rose: {
    card: "bg-rose-500/10 ring-rose-400/30",
    bar: "bg-rose-400",
    swatch: "bg-rose-400",
    badge: "border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-400",
  },
  violet: {
    card: "bg-violet-500/10 ring-violet-400/30",
    bar: "bg-violet-400",
    swatch: "bg-violet-400",
    badge:
      "border-violet-400/40 bg-violet-400/10 text-violet-700 dark:text-violet-400",
    dot: "bg-violet-400",
  },
  slate: {
    card: "bg-slate-500/10 ring-slate-400/30",
    bar: "bg-slate-400",
    swatch: "bg-slate-400",
    badge:
      "border-slate-400/40 bg-slate-400/10 text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  orange: {
    card: "bg-orange-500/10 ring-orange-400/30",
    bar: "bg-orange-400",
    swatch: "bg-orange-400",
    badge:
      "border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-400",
    dot: "bg-orange-400",
  },
};

export const isEventColorId = (value: string | null | undefined): value is EventColorId =>
  Boolean(value && EVENT_COLOR_IDS.includes(value as EventColorId));

export const resolveEventColor = (event: {
  type: "teatro" | "viagem" | "evangelismo" | "outro";
  color: string | null;
}): EventColorId => {
  if (isEventColorId(event.color)) {
    return event.color;
  }

  return EVENT_TYPE_DEFAULT_COLOR[event.type];
};
