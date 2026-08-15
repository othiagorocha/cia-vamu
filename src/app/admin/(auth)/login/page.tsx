import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginView } from "@/modules/auth/ui/views/login-view";

export const metadata: Metadata = {
  title: "Entrar",
};

const AdminLoginPage = () => {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
};

export default AdminLoginPage;
