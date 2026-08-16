import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  AlbumsAdminView,
  AlbumsAdminViewSkeleton,
} from "@/modules/albums/ui/views/albums-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Álbuns",
};

const AdminAlbumsPage = async () => {
  const session = await getSession();
  const canWrite = hasCapability(session, "albums:write");

  await trpc.albums.listAll.prefetch();

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar os álbuns.">
        <Suspense fallback={<AlbumsAdminViewSkeleton />}>
          <AlbumsAdminView canWrite={canWrite} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminAlbumsPage;
