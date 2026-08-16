import { z } from "zod";

const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, "Imagem inválida.")
  .optional();

export const updateMyProfileSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  testimony: z.string().optional(),
  photo: dataUrlSchema,
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;

export const updateMemberFlagsSchema = z.object({
  userId: z.string().min(1),
  role: z.string().optional(),
  isMember: z.boolean(),
  showOnAbout: z.boolean(),
});
