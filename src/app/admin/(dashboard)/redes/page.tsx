import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  SocialAdminView,
  SocialAdminViewSkeleton,
} from "@/modules/social/ui/views/social-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redes sociais",
};

const AdminSocialPage = async () => {
  const session = await getSession();

  if (!hasCapability(session, "site:write")) {
    redirect("/admin");
  }

  await trpc.social.listAll.prefetch();

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar as redes.">
        <Suspense fallback={<SocialAdminViewSkeleton />}>
          <SocialAdminView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminSocialPage;
