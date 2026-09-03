import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense>
      <NuqsAdapter>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </NuqsAdapter>
    </Suspense>
  );
};

export default PublicLayout;
