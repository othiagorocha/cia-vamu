"use client";

import { useTranslations } from "next-intl";

import { Reveal } from "@/components/reveal";
import { AboutMembersSlider } from "@/modules/about/ui/components/about-members-slider";
import { trpc } from "@/trpc/client";

export const AboutMembers = () => {
  const t = useTranslations("about.members");
  const { data } = trpc.members.listPublic.useQuery();

  if (!data || data.length === 0) {
    return (
      <Reveal>
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("empty")}</p>
        </section>
      </Reveal>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <Reveal>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
      </Reveal>
      <Reveal>
        <AboutMembersSlider members={data} />
      </Reveal>
    </section>
  );
};
