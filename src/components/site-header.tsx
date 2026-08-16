"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SiteHeader = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("common");

  const NAV_LINKS = [
    { href: "/", label: t("nav.home") },
    { href: "/quem-somos", label: t("nav.about") },
    { href: "/albuns", label: t("nav.albums") },
    { href: "/agenda", label: t("nav.agenda") },
    { href: "/oracao", label: t("nav.prayerCta") },
    { href: "/contato", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo variant="white" className="size-9" priority />
          <span className="text-lg">{t("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-orange-400 after:transition-transform after:duration-300",
                pathname === link.href && "text-foreground after:scale-x-100",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Abrir menu"
        >
          <MenuIcon className="size-5" />
        </Button>
      </div>

      {isOpen && (
        <nav className="flex flex-col gap-1 border-t px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                pathname === link.href &&
                  "border-orange-400 bg-muted text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};
