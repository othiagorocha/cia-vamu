import { z } from "zod";

export const socialPlatforms = [
  "instagram",
  "youtube",
  "facebook",
  "whatsapp",
  "spotify",
  "other",
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export const OTHER_ICON_NAMES = [
  "Globe",
  "Link",
  "Play",
  "Camera",
  "Heart",
  "Music",
  "Mail",
  "Instagram",
  "Youtube",
  "Facebook",
] as const;

export const socialLinkFormSchema = z
  .object({
    platform: z.enum(socialPlatforms),
    label: z.string().min(2, "Informe o rótulo."),
    url: z.url("Informe uma URL válida."),
    iconName: z.string().optional(),
    published: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.platform === "other" && data.iconName) {
      if (!OTHER_ICON_NAMES.includes(data.iconName as (typeof OTHER_ICON_NAMES)[number])) {
        ctx.addIssue({
          code: "custom",
          path: ["iconName"],
          message: "Escolha um ícone da paleta.",
        });
      }
    }
  });

export type SocialLinkFormInput = z.infer<typeof socialLinkFormSchema>;

export const createSocialLinkSchema = socialLinkFormSchema;

export const updateSocialLinkSchema = z.object({
  id: z.uuid(),
  data: socialLinkFormSchema,
});

export const removeSocialLinkSchema = z.object({
  id: z.uuid(),
});

export const reorderSocialLinkSchema = z.object({
  id: z.uuid(),
  direction: z.enum(["up", "down"]),
});
