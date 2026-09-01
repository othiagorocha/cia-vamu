import { formatBrazilDateTime } from "@/lib/brazil-datetime";
import { eventLocationLabel } from "@/lib/google-maps-url";
import { eventTypeShareLine } from "@/modules/events/event-types";
import type { EventRecord } from "@/modules/events/types";

export type EventShareLabels = {
  heading: string;
  when: string;
  where: string;
};

const eventDescription = (event: EventRecord) =>
  event.description?.trim() || "";

const eventTypeLine = (event: EventRecord) =>
  eventTypeShareLine(event.type.slug, event.type.label);

const eventPlainBlock = (event: EventRecord) => {
  const lines = [event.title];
  const description = eventDescription(event);
  const type = eventTypeLine(event);
  const location = eventLocationLabel(event);

  if (description) {
    lines.push(description);
  }

  lines.push(`📅 ${formatBrazilDateTime(event.startsAt)}`);

  if (location) {
    lines.push(`📍 ${location}`);
  }

  if (type) {
    lines.push(type);
  }

  return lines.join("\n");
};

const eventMarkdownBlock = (event: EventRecord, labels: EventShareLabels) => {
  const lines = [`## ${event.title}`];
  const description = eventDescription(event);
  const type = eventTypeLine(event);
  const location = eventLocationLabel(event);

  if (description) {
    lines.push(description);
  }

  lines.push(`- **${labels.when}:** ${formatBrazilDateTime(event.startsAt)}`);

  if (location) {
    lines.push(`- **${labels.where}:** ${location}`);
  }

  if (type) {
    lines.push(`- ${type}`);
  }

  return lines.join("\n");
};

const eventWhatsAppBlock = (event: EventRecord) => {
  const lines = [`*${event.title}*`];
  const description = eventDescription(event);
  const type = eventTypeLine(event);
  const location = eventLocationLabel(event);

  if (description) {
    lines.push(description);
  }

  lines.push(`📅 ${formatBrazilDateTime(event.startsAt)}`);

  if (location) {
    lines.push(`📍 ${location}`);
  }

  if (type) {
    lines.push(type);
  }

  return lines.join("\n");
};

export const buildEventsPlainText = (
  events: EventRecord[],
  labels: EventShareLabels,
) =>
  `${labels.heading}\n\n${events.map((event) => eventPlainBlock(event)).join("\n\n---\n\n")}`;

export const buildEventsMarkdown = (
  events: EventRecord[],
  labels: EventShareLabels,
) =>
  `# ${labels.heading}\n\n${events.map((event) => eventMarkdownBlock(event, labels)).join("\n\n")}`;

export const buildEventsWhatsAppText = (
  events: EventRecord[],
  labels: EventShareLabels,
) =>
  `${labels.heading}\n\n${events.map((event) => eventWhatsAppBlock(event)).join("\n\n---\n\n")}`;

const isLikelyMobile = () =>
  /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const whatsappShareUrl = (text: string) => {
  const encoded = encodeURIComponent(text);
  const host = isLikelyMobile()
    ? "https://api.whatsapp.com/send"
    : "https://web.whatsapp.com/send";

  return `${host}?text=${encoded}`;
};

export const shareTextToWhatsApp = async (text: string) => {
  const canShare =
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare({ text }));

  if (canShare) {
    try {
      await navigator.share({ text });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
};

export const copyTextToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};
