import type { Metadata } from "next";

import { getSafeAdminRedirect } from "@/lib/hard-navigate";
import { LoginView } from "@/modules/auth/ui/views/login-view";

export const metadata: Metadata = {
  title: "Entrar",
};

type AdminLoginPageProps = {
  searchParams: Promise<{ redirect?: string | string[]; error?: string | string[] }>;
};

const AdminLoginPage = async ({ searchParams }: AdminLoginPageProps) => {
  const params = await searchParams;
  const redirectTo = getSafeAdminRedirect(
    typeof params.redirect === "string" ? params.redirect : null,
  );
  const error = typeof params.error === "string" ? params.error : undefined;

  return <LoginView redirectTo={redirectTo} error={error} />;
};

export default AdminLoginPage;
