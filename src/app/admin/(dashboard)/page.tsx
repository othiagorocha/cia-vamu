import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  DashboardOverviewView,
  DashboardOverviewViewSkeleton,
} from "@/modules/dashboard/ui/views/dashboard-overview-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel",
};

const AdminPage = async () => {
  const session = await getSession();
  const canEvents = hasCapability(session, "events:write");
  const canAlbums = hasCapability(session, "albums:write");
  const canManageUsers = hasCapability(session, "users:manage");

  await Promise.all([
    canEvents ? trpc.events.listAll.prefetch() : Promise.resolve(),
    canAlbums ? trpc.albums.listAll.prefetch() : Promise.resolve(),
    canManageUsers ? trpc.contact.listAll.prefetch() : Promise.resolve(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar o painel.">
        <Suspense fallback={<DashboardOverviewViewSkeleton />}>
          <DashboardOverviewView
            canEvents={canEvents}
            canAlbums={canAlbums}
            canManageUsers={canManageUsers}
          />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminPage;
