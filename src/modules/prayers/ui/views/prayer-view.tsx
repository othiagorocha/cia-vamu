"use client";

import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { PrayerRequestForm } from "@/modules/prayers/ui/components/prayer-request-form";

export const PrayerView = () => {
  const t = useTranslations("prayers");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-16">
      <Reveal>
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo variant="white" className="size-14" />
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>

      <Reveal delayMs={80}>
        <Card>
          <CardContent className="pt-6">
            <PrayerRequestForm />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
};
