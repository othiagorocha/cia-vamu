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
  const canEvents = Boolean(session);
  const canAlbums = Boolean(session);
  const canContact = hasCapability(session, "contact:manage");
  const canStaff = hasCapability(session, "users:manage");

  await Promise.all([
    trpc.events.listAll.prefetch(),
    trpc.albums.listAll.prefetch(),
    trpc.prayers.list.prefetch(),
    canContact
      ? trpc.contact.listAll.prefetch()
      : trpc.documents.listFolderTree.prefetch(),
    canStaff ? trpc.staff.list.prefetch() : Promise.resolve(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar o painel.">
        <Suspense fallback={<DashboardOverviewViewSkeleton />}>
          <DashboardOverviewView
            canEvents={canEvents}
            canAlbums={canAlbums}
            canContact={canContact}
            canStaff={canStaff}
          />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminPage;
