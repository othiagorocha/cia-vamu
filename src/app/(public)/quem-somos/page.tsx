import type { Metadata } from "next";

import { AboutView } from "@/modules/about/ui/views/about-view";

export const metadata: Metadata = {
  title: "Quem somos | CIA VAMU",
  description:
    "Conheça a CIA VAMU: Visão, Arte, Missão, Unção. Nossa história, missão e valores.",
};

const AboutPage = () => {
  return <AboutView />;
};

export default AboutPage;
