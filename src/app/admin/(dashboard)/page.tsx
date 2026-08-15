import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
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
  await Promise.all([
    trpc.events.listAll.prefetch(),
    trpc.albums.listAll.prefetch(),
    trpc.contact.listAll.prefetch(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar o painel.">
        <Suspense fallback={<DashboardOverviewViewSkeleton />}>
          <DashboardOverviewView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminPage;
