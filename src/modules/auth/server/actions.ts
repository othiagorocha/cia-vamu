"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";

import { getSafeAdminRedirect } from "@/lib/hard-navigate";
import { auth } from "@/lib/auth";
import {
  clientErrorKey,
  type ErrorMessageKey,
} from "@/lib/client-error";
import { loginSchema } from "@/modules/auth/schema";

function loginUrl(redirectTo: string, error?: ErrorMessageKey) {
  const params = new URLSearchParams({ redirect: redirectTo });
  if (error) params.set("error", error);
  return `/admin/login?${params.toString()}`;
}

export async function signInAction(formData: FormData) {
  const redirectTo = getSafeAdminRedirect(
    String(formData.get("redirectTo") ?? ""),
  );

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    redirect(loginUrl(redirectTo, "invalidCredentials"));
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
      redirect(
        loginUrl(
          redirectTo,
          clientErrorKey({
            message: error.body?.message ?? error.message,
            code: error.body?.code,
            status: error.statusCode,
          }),
        ),
      );
    }

    redirect(loginUrl(redirectTo, "generic"));
  }

  redirect(redirectTo);
}
