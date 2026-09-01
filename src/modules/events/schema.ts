import { z } from "zod";

import { parseBrazilDateTime } from "@/lib/brazil-datetime";
import { isImageDataUrl } from "@/lib/data-url";
import { EVENT_COLOR_IDS } from "@/modules/events/event-colors";
import { countEventTypeGraphemes } from "@/modules/events/event-types";

export const eventColorSchema = z.enum(EVENT_COLOR_IDS);

const dataUrlSchema = z
  .string()
  .refine(isImageDataUrl, "Imagem inválida.");

const eventDateRefine = (
  data: { startsAt: string; endsAt?: string },
) =>
  !data.endsAt ||
  parseBrazilDateTime(data.endsAt) >= parseBrazilDateTime(data.startsAt);

const eventDateRefineConfig = {
  message: "A data de término não pode ser anterior ao início.",
  path: ["endsAt"] as string[],
};

const eventFormFields = z.object({
  title: z.string().min(2, "Informe um título."),
  description: z.string().optional(),
  typeId: z.uuid(),
  startsAt: z.string().min(1, "Informe a data de início."),
  endsAt: z.string().optional(),
  location: z.string().optional(),
  locationMapsQuery: z.string().optional(),
  published: z.boolean(),
  color: eventColorSchema.nullable(),
  important: z.boolean(),
  image: dataUrlSchema.optional(),
  removeImage: z.boolean().optional(),
});

export const eventFormSchema = eventFormFields.refine(
  eventDateRefine,
  eventDateRefineConfig,
);

export type EventFormInput = z.infer<typeof eventFormSchema>;

const toCreateEvent = <T extends z.infer<typeof eventFormFields>>(data: T) => ({
  ...data,
  startsAt: parseBrazilDateTime(data.startsAt),
  endsAt: data.endsAt ? parseBrazilDateTime(data.endsAt) : undefined,
  location: data.location?.trim() || undefined,
  locationMapsQuery: data.locationMapsQuery?.trim() || undefined,
  color: data.color ?? null,
});

export const createEventSchema = eventFormFields
  .extend({
    sourceEventId: z.uuid().optional(),
  })
  .refine(eventDateRefine, eventDateRefineConfig)
  .transform(toCreateEvent);

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
  id: z.uuid(),
  data: eventFormSchema.transform(toCreateEvent),
});

export const removeEventSchema = z.object({
  id: z.uuid(),
});

export const reorderEventSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

export const suggestLocationsSchema = z.object({
  query: z.string().trim().min(2).max(200),
});

export const changeEventTypeSchema = z.object({
  id: z.uuid(),
  typeId: z.uuid(),
});

export const eventTypeEmojiSchema = z
  .string()
  .trim()
  .min(1, "Informe um emoji.")
  .refine((value) => value.length <= 32, "Emoji inválido.")
  .refine(
    (value) => countEventTypeGraphemes(value) === 1,
    "Use um único emoji.",
  );

export const eventTypeFormSchema = z.object({
  label: z.string().trim().min(2, "Informe um nome.").max(40),
  emoji: eventTypeEmojiSchema,
  defaultColor: eventColorSchema,
});

export type EventTypeFormInput = z.infer<typeof eventTypeFormSchema>;

export const createEventTypeSchema = eventTypeFormSchema;

export const updateEventTypeSchema = z.object({
  id: z.uuid(),
  data: eventTypeFormSchema,
});

export const removeEventTypeSchema = z.object({
  id: z.uuid(),
});
