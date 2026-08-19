"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  FilesIcon,
  HistoryIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MailIcon,
  Share2Icon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PiHandsPrayingBold } from "react-icons/pi";

import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { trpc } from "@/trpc/client";

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
  const meQuery = trpc.members.getMe.useQuery();
  const photoUrl = meQuery.data?.photoUrl ?? null;
  const displayName = meQuery.data?.name ?? user.name;
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  const NAV_ITEMS = [
    { href: "/admin", label: t("overview"), icon: LayoutDashboardIcon },
    { href: "/admin/events", label: t("events"), icon: CalendarDaysIcon },
    { href: "/admin/albums", label: t("albums"), icon: ImagesIcon },
    { href: "/admin/oracao", label: t("prayers"), icon: PiHandsPrayingBold },
    { href: "/admin/documentos", label: t("documents"), icon: FilesIcon },
    ...(hasCapability(session, "site:write")
      ? [{ href: "/admin/redes", label: t("social"), icon: Share2Icon }]
      : []),
    ...(hasCapability(session, "contact:manage")
      ? [{ href: "/admin/mensagens", label: t("messages"), icon: MailIcon }]
      : []),
    ...(hasCapability(session, "users:manage")
      ? [{ href: "/admin/equipe", label: t("staff"), icon: UsersIcon }]
      : []),
    ...(hasCapability(session, "users:manage")
      ? [{ href: "/admin/auditoria", label: t("audit"), icon: HistoryIcon }]
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
            <SidebarMenuButton
              asChild
              isActive={isActive("/admin/perfil")}
              className="h-auto py-1.5"
            >
              <Link href="/admin/perfil" aria-label={t("profile")}>
                <Avatar>
                  {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                <span>{t("viewSite")}</span>
              </a>
            </SidebarMenuButton>
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
