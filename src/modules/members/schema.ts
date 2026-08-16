import { z } from "zod";

import { isImageDataUrl } from "@/lib/data-url";

const dataUrlSchema = z
  .string()
  .refine(isImageDataUrl, "Imagem inválida.")
  .optional();

export const updateMyProfileSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  testimony: z.string().optional(),
  photo: dataUrlSchema,
  removePhoto: z.boolean().optional(),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;

export const updateMemberFlagsSchema = z.object({
  userId: z.string().min(1),
  role: z.string().optional(),
  isMember: z.boolean(),
  showOnAbout: z.boolean(),
});
