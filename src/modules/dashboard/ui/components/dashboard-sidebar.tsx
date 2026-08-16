"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { hasCapability, type SiteCapability } from "@/lib/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

type DashboardSidebarProps = {
  user: {
    name: string;
    email: string;
  };
  capabilities: SiteCapability[];
};

export const DashboardSidebar = ({
  user,
  capabilities,
}: DashboardSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("dashboard.nav");
  const tCommon = useTranslations("common");
  const session = { user: { capabilities } };

  const NAV_ITEMS = [
    { href: "/admin", label: t("overview"), icon: LayoutDashboardIcon },
    ...(hasCapability(session, "events:write")
      ? [{ href: "/admin/events", label: t("events"), icon: CalendarDaysIcon }]
      : []),
    ...(hasCapability(session, "albums:write")
      ? [{ href: "/admin/albums", label: t("albums"), icon: ImagesIcon }]
      : []),
    ...(hasCapability(session, "users:manage")
      ? [{ href: "/admin/equipe", label: t("staff"), icon: UsersIcon }]
      : []),
  ];

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/admin" className="flex items-center gap-2 px-2 py-1.5">
          <Logo variant="white" className="size-8" />
          <span className="font-semibold">{tCommon("brand")}</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("groupLabel")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2 px-2 py-1.5 text-sm">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOutIcon />
              <span>{tCommon("actions.signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
