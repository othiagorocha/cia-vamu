import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  AuditAdminView,
  AuditAdminViewSkeleton,
} from "@/modules/audit/ui/views/audit-admin-view";
import { AUDIT_PAGE_SIZE } from "@/modules/audit/schema";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Auditoria",
};

const AdminAuditPage = async () => {
  const session = await getSession();

  if (!session || !hasCapability(session, "users:manage")) {
    redirect("/admin");
  }

  await Promise.all([
    trpc.audit.list.prefetch({ offset: 0, limit: AUDIT_PAGE_SIZE }),
    trpc.staff.list.prefetch(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar a auditoria.">
        <Suspense fallback={<AuditAdminViewSkeleton />}>
          <AuditAdminView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminAuditPage;
