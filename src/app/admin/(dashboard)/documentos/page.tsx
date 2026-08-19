import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { getSession } from "@/lib/session";
import {
  DocumentsAdminView,
  DocumentsAdminViewSkeleton,
} from "@/modules/documents/ui/views/documents-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Documentos",
};

const AdminDocumentsPage = async () => {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  await trpc.documents.listFolder.prefetch({ folderId: null });

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar os documentos.">
        <Suspense fallback={<DocumentsAdminViewSkeleton />}>
          <DocumentsAdminView folderId={null} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminDocumentsPage;
