import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  StaffAdminView,
  StaffAdminViewSkeleton,
} from "@/modules/staff/ui/views/staff-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Equipe",
};

const AdminStaffPage = async () => {
  const session = await getSession();

  if (!session || !hasCapability(session, "users:manage")) {
    redirect("/admin");
  }

  await trpc.staff.list.prefetch();

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar a equipe.">
        <Suspense fallback={<StaffAdminViewSkeleton />}>
          <StaffAdminView currentUserId={session.user.id} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminStaffPage;
