import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCapabilities } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { ForcePasswordChangeDialog } from "@/modules/auth/ui/components/force-password-change-dialog";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <Suspense>
      <NuqsAdapter>
        <SidebarProvider>
          <DashboardSidebar
            user={{
              name: session.user.name,
              email: session.user.email,
            }}
            capabilities={getCapabilities(session)}
          />
          <SidebarInset className="min-w-0">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
              <SidebarTrigger />
              <span className="text-sm font-medium text-muted-foreground">
                Painel administrativo
              </span>
            </header>
            <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">{children}</main>
          </SidebarInset>
          <ForcePasswordChangeDialog
            required={Boolean(session.user.mustChangePassword)}
          />
        </SidebarProvider>
      </NuqsAdapter>
    </Suspense>
  );
};

export default AdminLayout;
