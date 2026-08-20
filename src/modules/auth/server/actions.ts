"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";

import { getSafeAdminRedirect } from "@/lib/hard-navigate";
import { auth } from "@/lib/auth";
import { loginSchema, type LoginInput } from "@/modules/auth/schema";

export type SignInActionResult = {
  error: { message?: string; code?: string; status?: number };
} | null;

/**
 * Faz login e redireciona no mesmo request (SSR): o cookie de sessão e o
 * redirect saem na mesma resposta, sem a janela de corrida entre o fetch do
 * client e a navegação que causava tela em branco no mobile.
 */
export async function signInAction(
  values: LoginInput,
  redirectTo: string | null,
): Promise<SignInActionResult> {
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return { error: { message: "Dados inválidos." } };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email.toLowerCase().trim(),
        password: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return {
        error: {
          message: error.body?.message ?? error.message,
          code: error.body?.code,
          status: error.statusCode,
        },
      };
    }

    return {
      error: { message: "Não foi possível entrar. Tente novamente." },
    };
  }

  redirect(getSafeAdminRedirect(redirectTo));
}
