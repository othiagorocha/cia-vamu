import { Compass, Drama, HeartHandshake, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { revealDelay } from "@/lib/reveal-delay";
import { AboutMembers } from "@/modules/about/ui/components/about-members";

const PILLARS = [
  { key: "vision", letter: "V", icon: Compass },
  { key: "art", letter: "A", icon: Drama },
  { key: "mission", letter: "M", icon: HeartHandshake },
  { key: "unction", letter: "U", icon: Sparkles },
] as const;

export const AboutView = () => {
  const t = useTranslations("about");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-16 px-4 py-16">
      <Reveal>
        <section className="flex flex-col items-center gap-4 text-center">
          <Logo variant="white" className="size-20" />
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            {t.rich("intro", {
              strong: (chunks) => (
                <strong className="text-foreground">{chunks}</strong>
              ),
            })}
          </p>
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
                  {t(`pillars.${pillar.key}.title`).slice(1)}
                </span>
              </span>
            ))}
          </p>
          <p className="text-sm text-muted-foreground">{t("affiliation")}</p>
        </section>
      </Reveal>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PILLARS.map((pillar, index) => (
          <Reveal key={pillar.key} delayMs={revealDelay(index)} className="h-full">
            <div className="flex h-full flex-col gap-3 rounded-lg border p-6 transition-colors duration-300 hover:border-orange-400/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-orange-400 dark:bg-white">
                  {pillar.letter}
                </span>
                <h2 className="text-xl font-semibold">
                  {t(`pillars.${pillar.key}.title`)}
                </h2>
                <pillar.icon className="ml-auto size-5 text-orange-400" />
              </div>
              <p className="text-muted-foreground">
                {t(`pillars.${pillar.key}.description`)}
              </p>
            </div>
          </Reveal>
        ))}
      </section>

      <Reveal>
        <section className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("missionSection.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t("missionSection.description")}
          </p>
        </section>
      </Reveal>

      <AboutMembers />
    </div>
  );
};
