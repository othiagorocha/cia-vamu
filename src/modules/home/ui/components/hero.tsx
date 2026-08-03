import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  const t = useTranslations("home.hero");

  return (
    <section className="relative overflow-hidden bg-black text-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-28 text-center">
        <Logo variant="white" className="size-28 sm:size-36" priority />
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-lg text-white/70">{t("subtitle")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-orange-400 text-black hover:bg-orange-300"
          >
            <Link href="/agenda">
              {t("primaryCta")}
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/quem-somos">{t("secondaryCta")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
