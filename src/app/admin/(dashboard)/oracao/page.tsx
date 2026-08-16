import type { Metadata } from "next";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  PrayerAdminView,
  PrayerAdminViewSkeleton,
} from "@/modules/prayers/ui/views/prayer-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedidos de oração",
};

const AdminPrayersPage = async () => {
  const session = await getSession();
  const canManage = hasCapability(session, "users:manage");

  await trpc.prayers.list.prefetch();

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar os pedidos de oração.">
        <Suspense fallback={<PrayerAdminViewSkeleton />}>
          <PrayerAdminView canManage={canManage} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminPrayersPage;
