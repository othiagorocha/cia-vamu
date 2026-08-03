import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.email("Informe um e-mail válido."),
  message: z.string().min(10, "Escreva uma mensagem com pelo menos 10 caracteres."),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
