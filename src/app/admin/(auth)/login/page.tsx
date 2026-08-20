import type { Metadata } from "next";

import { getSafeAdminRedirect } from "@/lib/hard-navigate";
import { LoginView } from "@/modules/auth/ui/views/login-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
};

type AdminLoginPageProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

const AdminLoginPage = async ({ searchParams }: AdminLoginPageProps) => {
  const params = await searchParams;
  const raw = params.redirect;
  const redirectTo =
    typeof raw === "string" ? getSafeAdminRedirect(raw) : null;

  return <LoginView redirectTo={redirectTo} />;
};

export default AdminLoginPage;
