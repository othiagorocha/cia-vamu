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
