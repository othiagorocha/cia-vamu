import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  ContactAdminView,
  ContactAdminViewSkeleton,
} from "@/modules/contact/ui/views/contact-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mensagens",
};

const AdminMessagesPage = async () => {
  const session = await getSession();

  if (!hasCapability(session, "contact:manage")) {
    redirect("/admin");
  }

  await trpc.contact.listAll.prefetch();

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar as mensagens.">
        <Suspense fallback={<ContactAdminViewSkeleton />}>
          <ContactAdminView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminMessagesPage;
