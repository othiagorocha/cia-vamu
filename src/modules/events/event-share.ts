import { formatBrazilDateTime } from "@/lib/brazil-datetime";
import { eventLocationLabel } from "@/lib/google-maps-url";
import type { EventRecord } from "@/modules/events/types";

export type EventShareLabels = {
  heading: string;
  publicVisibility: string;
  teamVisibility: string;
  when: string;
  where: string;
};

const visibilityLine = (event: EventRecord, labels: EventShareLabels) =>
  event.published ? labels.publicVisibility : labels.teamVisibility;

const eventPlainBlock = (event: EventRecord, labels: EventShareLabels) => {
  const lines = [
    event.title,
    `📅 ${formatBrazilDateTime(event.startsAt)}`,
  ];

  const location = eventLocationLabel(event);
  if (location) {
    lines.push(`📍 ${location}`);
  }

  lines.push(visibilityLine(event, labels));

  if (event.description?.trim()) {
    lines.push("", event.description.trim());
  }

  return lines.join("\n");
};

const eventMarkdownBlock = (event: EventRecord, labels: EventShareLabels) => {
  const lines = [
    `## ${event.title}`,
    `- **${labels.when}:** ${formatBrazilDateTime(event.startsAt)}`,
  ];

  const location = eventLocationLabel(event);
  if (location) {
    lines.push(`- **${labels.where}:** ${location}`);
  }

  lines.push(`- ${visibilityLine(event, labels)}`);

  if (event.description?.trim()) {
    lines.push("", event.description.trim());
  }

  return lines.join("\n");
};

export const buildEventsPlainText = (
  events: EventRecord[],
  labels: EventShareLabels,
) =>
  `${labels.heading}\n\n${events.map((event) => eventPlainBlock(event, labels)).join("\n\n---\n\n")}`;

export const buildEventsMarkdown = (
  events: EventRecord[],
  labels: EventShareLabels,
) =>
  `# ${labels.heading}\n\n${events.map((event) => eventMarkdownBlock(event, labels)).join("\n\n")}`;

export const buildEventsWhatsAppText = (
  events: EventRecord[],
  labels: EventShareLabels,
) => {
  const blocks = events.map((event) => {
    const lines = [
      `*${event.title}*`,
      `📅 ${formatBrazilDateTime(event.startsAt)}`,
    ];
    const location = eventLocationLabel(event);

    if (location) {
      lines.push(`📍 ${location}`);
    }

    lines.push(visibilityLine(event, labels));

    if (event.description?.trim()) {
      lines.push("", event.description.trim());
    }

    return lines.join("\n");
  });

  return `${labels.heading}\n\n${blocks.join("\n\n---\n\n")}`;
};

export const whatsappShareUrl = (text: string) =>
  `https://wa.me/?text=${encodeURIComponent(text)}`;

export const copyTextToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};
