import { z } from "zod";

export const eventTypeSchema = z.enum([
  "teatro",
  "viagem",
  "evangelismo",
  "outro",
]);

const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, "Imagem inválida.");

export const eventFormSchema = z
  .object({
    title: z.string().min(2, "Informe um título."),
    description: z.string().optional(),
    type: eventTypeSchema,
    startsAt: z.string().min(1, "Informe a data de início."),
    endsAt: z.string().optional(),
    location: z.string().optional(),
    published: z.boolean(),
    image: dataUrlSchema.optional(),
  })
  .refine(
    (data) => !data.endsAt || new Date(data.endsAt) >= new Date(data.startsAt),
    {
      message: "A data de término não pode ser anterior ao início.",
      path: ["endsAt"],
    },
  );

export type EventFormInput = z.infer<typeof eventFormSchema>;

export const createEventSchema = eventFormSchema.transform((data) => ({
  ...data,
  startsAt: new Date(data.startsAt),
  endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
}));

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
  id: z.uuid(),
  data: createEventSchema,
});

export const removeEventSchema = z.object({
  id: z.uuid(),
});
