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
  title: "Agenda",
};

const AdminAgendaPage = async () => {
  const session = await getSession();
  const canWrite = hasCapability(session, "events:write");
  const canManageTypes = hasCapability(session, "users:manage");

  await Promise.all([
    trpc.events.listAll.prefetch(),
    trpc.eventTypes.list.prefetch(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar os eventos.">
        <Suspense fallback={<EventsAdminViewSkeleton />}>
          <EventsAdminView canWrite={canWrite} canManageTypes={canManageTypes} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminAgendaPage;
