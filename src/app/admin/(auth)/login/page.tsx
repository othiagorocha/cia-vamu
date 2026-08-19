import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginView } from "@/modules/auth/ui/views/login-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
};

const AdminLoginPage = () => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginView />
    </Suspense>
  );
};

export default AdminLoginPage;
