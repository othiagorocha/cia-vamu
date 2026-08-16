import Link from "next/link";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { SiteSocialLinks } from "@/modules/social/ui/components/site-social-links";

export const SiteFooter = () => {
  const t = useTranslations("common");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-card text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Logo variant="white" className="size-10" />
            <span className="text-lg font-semibold">{t("brand")}</span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
          <p className="text-sm font-medium">{t("social.follow")}</p>
          <SiteSocialLinks />
        </div>

        <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link href="/quem-somos" className="hover:text-foreground">
            {t("nav.about")}
          </Link>
          <Link href="/albuns" className="hover:text-foreground">
            {t("nav.albums")}
          </Link>
          <Link href="/agenda" className="hover:text-foreground">
            {t("nav.agenda")}
          </Link>
          <Link href="/oracao" className="hover:text-foreground">
            {t("nav.prayer")}
          </Link>
          <Link href="/contato" className="hover:text-foreground">
            {t("nav.contact")}
          </Link>
        </nav>
      </div>
      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        © {year} {t("brand")}. {t("footer.rights")}
      </div>
    </footer>
  );
};
