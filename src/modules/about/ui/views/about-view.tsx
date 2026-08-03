import { Compass, Drama, HeartHandshake, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";

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
      <section className="flex flex-col items-center gap-4 text-center">
        <Logo variant="white" className="size-20" />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t.rich("intro", {
            strong: (chunks) => (
              <strong className="text-foreground">{chunks}</strong>
            ),
          })}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.key}
            className="flex flex-col gap-3 rounded-lg border p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-white dark:bg-white dark:text-black">
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
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("missionSection.title")}
        </h2>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          {t("missionSection.description")}
        </p>
      </section>
    </div>
  );
};
