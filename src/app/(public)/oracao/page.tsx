import type { Metadata } from "next";

import { PrayerView } from "@/modules/prayers/ui/views/prayer-view";

export const metadata: Metadata = {
  title: "Oração",
  description: "Deixe um pedido de oração para a equipe da CIA VAMU.",
};

export const dynamic = "force-dynamic";

const PrayerPage = () => {
  return <PrayerView />;
};

export default PrayerPage;
