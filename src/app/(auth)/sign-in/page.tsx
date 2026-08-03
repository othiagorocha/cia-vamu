import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInView } from "@/modules/auth/ui/views/sign-in-view";

export const metadata: Metadata = {
  title: "Entrar | CIA VAMU",
};

const SignInPage = () => {
  return (
    <Suspense>
      <SignInView />
    </Suspense>
  );
};

export default SignInPage;
