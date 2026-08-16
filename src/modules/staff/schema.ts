import { z } from "zod";

import { SITE_CAPABILITIES } from "@/lib/permissions";

export const siteCapabilitySchema = z.enum(SITE_CAPABILITIES);

export const staffCapabilitiesSchema = z
  .array(siteCapabilitySchema)
  .min(1, "Selecione pelo menos uma permissão.");

export const createStaffSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  capabilities: staffCapabilitiesSchema,
});

export type StaffFormInput = z.infer<typeof createStaffSchema>;

export const staffDialogSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  email: z.string(),
  password: z.string(),
  capabilities: staffCapabilitiesSchema,
});

export type StaffDialogInput = z.infer<typeof staffDialogSchema>;

export const getStaffDialogSchema = (isEditing: boolean) =>
  staffDialogSchema.superRefine((data, ctx) => {
    if (isEditing) {
      return;
    }

    if (!z.email().safeParse(data.email).success) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Informe um e-mail válido.",
      });
    }

    if (data.password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "A senha deve ter pelo menos 8 caracteres.",
      });
    }
  });

export const updateStaffFormSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  capabilities: staffCapabilitiesSchema,
});

export type UpdateStaffFormInput = z.infer<typeof updateStaffFormSchema>;

export const updateStaffSchema = updateStaffFormSchema.extend({
  id: z.string().min(1),
});

export const setStaffPasswordFormSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export type SetStaffPasswordFormInput = z.infer<typeof setStaffPasswordFormSchema>;

export const setStaffPasswordSchema = setStaffPasswordFormSchema.extend({
  id: z.string().min(1),
});

export const removeStaffSchema = z.object({
  id: z.string().min(1),
});
