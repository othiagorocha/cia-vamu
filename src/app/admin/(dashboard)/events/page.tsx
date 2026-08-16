import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  EventsAdminView,
  EventsAdminViewSkeleton,
} from "@/modules/events/ui/views/events-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Eventos",
};

const AdminEventsPage = async () => {
  const session = await getSession();
  const canWrite = hasCapability(session, "events:write");

  await trpc.events.listAll.prefetch();

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar os eventos.">
        <Suspense fallback={<EventsAdminViewSkeleton />}>
          <EventsAdminView canWrite={canWrite} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminEventsPage;
