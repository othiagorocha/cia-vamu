import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getCapabilities } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
        }}
        capabilities={getCapabilities(session)}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            Painel administrativo
          </span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminLayout;
