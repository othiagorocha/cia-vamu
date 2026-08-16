import { z } from "zod";

export const prayerRequestFormSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(10, "Escreva um pedido com pelo menos 10 caracteres."),
    isAnonymous: z.boolean(),
    name: z.string().trim(),
    email: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (!data.isAnonymous && data.name.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Informe seu nome.",
      });
    }

    if (!data.isAnonymous && data.email.length > 0) {
      const parsed = z.email().safeParse(data.email);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Informe um e-mail válido.",
        });
      }
    }
  });

export type PrayerRequestFormInput = z.infer<typeof prayerRequestFormSchema>;
