import { z } from "zod";

import {
  EDITOR_CAPABILITIES,
  SITE_CAPABILITIES,
  SITE_ROLES,
} from "@/lib/permissions";

export const siteCapabilitySchema = z.enum(SITE_CAPABILITIES);
export const siteRoleSchema = z.enum(SITE_ROLES);
export const editorModuleSchema = z.enum(EDITOR_CAPABILITIES);

export const staffCapabilitiesSchema = z.array(siteCapabilitySchema);

const requireEditorModules = (
  data: {
    accessRole: z.infer<typeof siteRoleSchema>;
    editorModules: z.infer<typeof editorModuleSchema>[];
  },
  ctx: z.RefinementCtx,
) => {
  if (data.accessRole === "editor" && data.editorModules.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["editorModules"],
      message: "Selecione pelo menos um módulo para o editor.",
    });
  }
};

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
  accessRole: siteRoleSchema,
  editorModules: z.array(editorModuleSchema),
  role: z.string().optional(),
  isMember: z.boolean(),
  showOnAbout: z.boolean(),
});

export type StaffDialogInput = z.infer<typeof staffDialogSchema>;

export const getStaffDialogSchema = (isEditing: boolean) =>
  staffDialogSchema.superRefine((data, ctx) => {
    requireEditorModules(data, ctx);

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
  role: z.string().optional(),
  isMember: z.boolean(),
  showOnAbout: z.boolean(),
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

export const setDisabledSchema = z.object({
  id: z.string().min(1),
  disabled: z.boolean(),
});

export const createInviteSchema = z
  .object({
    accessRole: siteRoleSchema,
    editorModules: z.array(editorModuleSchema),
    reusable: z.boolean(),
  })
  .superRefine(requireEditorModules);

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const revokeInviteSchema = z.object({
  id: z.uuid(),
});

export const revealInviteSchema = z.object({
  id: z.uuid(),
});

export const inviteTokenSchema = z.object({
  token: z.string().min(32),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(32),
  name: z.string().min(2, "Informe o nome."),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
