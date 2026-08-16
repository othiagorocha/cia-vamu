import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const PILLARS = [
  { key: "vision", letter: "V" },
  { key: "art", letter: "A" },
  { key: "mission", letter: "M" },
  { key: "unction", letter: "U" },
] as const;

export const Hero = () => {
  const t = useTranslations("home.hero");
  const tAbout = useTranslations("about");

  return (
    <section className="relative overflow-hidden bg-black text-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-28 text-center">
        <div
          className="hero-enter"
          style={{ "--hero-delay": "0ms" } as CSSProperties}
        >
          <Logo variant="white" className="size-28 sm:size-36" priority />
        </div>
        <h1
          className="hero-enter text-4xl font-bold tracking-tight sm:text-6xl"
          style={{ "--hero-delay": "120ms" } as CSSProperties}
        >
          {t("title")}
        </h1>
        <div
          className="hero-enter flex max-w-xl flex-col items-center gap-2"
          style={{ "--hero-delay": "200ms" } as CSSProperties}
        >
          <p className="text-lg text-white/70">{t("subtitle")}</p>
          <p className="flex items-center justify-center gap-2 text-[0.95rem] font-semibold tracking-wide sm:gap-4 sm:text-xl sm:tracking-[0.2em]">
            {PILLARS.map((pillar, index) => (
              <span key={pillar.key} className="contents">
                {index > 0 ? (
                  <span className="select-none text-orange-400" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className="whitespace-nowrap">
                  <span className="text-orange-400">{pillar.letter}</span>
                  {tAbout(`pillars.${pillar.key}.title`).slice(1)}
                </span>
              </span>
            ))}
          </p>
        </div>
        <p
          className="hero-enter max-w-xl text-sm text-white/55"
          style={{ "--hero-delay": "280ms" } as CSSProperties}
        >
          {t("affiliation")}
        </p>
        <div
          className="hero-enter flex flex-wrap items-center justify-center gap-3"
          style={{ "--hero-delay": "360ms" } as CSSProperties}
        >
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
