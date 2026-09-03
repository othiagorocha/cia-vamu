const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
const BRAZIL_OFFSET = "-03:00";

const hasExplicitOffset = (value: string) =>
  /Z$/i.test(value) || /[+-]\d{2}:\d{2}$/.test(value);

/** Interpreta `datetime-local` como horário de Brasília, independente do TZ do servidor. */
export function parseBrazilDateTime(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return new Date(Number.NaN);
  }

  if (hasExplicitOffset(trimmed)) {
    return new Date(trimmed);
  }

  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed}:00`
    : trimmed;

  return new Date(`${withSeconds}${BRAZIL_OFFSET}`);
}

export function toBrazilDateTimeLocal(
  value: Date | string | null | undefined,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatted = date.toLocaleString("sv-SE", {
    timeZone: BRAZIL_TIME_ZONE,
  });

  return formatted.replace(" ", "T").slice(0, 16);
}

export function formatBrazilDateTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBrazilDateTimeShort(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Converte `yyyy-MM-dd` para valor de `datetime-local` em horário de Brasília. */
export function dayKeyToBrazilDateTimeLocal(
  dayKey: string,
  hour = 9,
  minute = 0,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return "";
  }

  return `${dayKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getBrazilDayKey(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("sv-SE", {
    timeZone: BRAZIL_TIME_ZONE,
  });
}

export function getBrazilMonthKey(value: Date | string) {
  return getBrazilDayKey(value).slice(0, 7);
}

export function getBrazilNow() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }

      return acc;
    }, {});

  return {
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
    monthKey: `${parts.year}-${parts.month}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

export function formatBrazilTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
