import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import {
  ProfileView,
  ProfileViewSkeleton,
} from "@/modules/members/ui/views/profile-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meu perfil",
};

const AdminProfilePage = async () => {
  await trpc.members.getMe.prefetch();

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar o perfil.">
        <Suspense fallback={<ProfileViewSkeleton />}>
          <ProfileView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminProfilePage;
