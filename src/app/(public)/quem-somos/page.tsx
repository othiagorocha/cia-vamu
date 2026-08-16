import type { Metadata } from "next";

import { AboutView } from "@/modules/about/ui/views/about-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Quem somos",
  description:
    "Conheça a CIA VAMU, ministério evangelístico missionário da Igreja Evangélica Batista de Ibitinga. Visão, Arte, Missão, Unção.",
};

export const dynamic = "force-dynamic";

const AboutPage = () => {
  void trpc.members.listPublic.prefetch();

  return (
    <HydrateClient>
      <AboutView />
    </HydrateClient>
  );
};

export default AboutPage;
