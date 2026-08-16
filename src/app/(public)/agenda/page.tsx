import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { Reveal } from "@/components/reveal";
import {
  EventsView,
  EventsViewSkeleton,
} from "@/modules/events/ui/views/events-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Próximos eventos da CIA VAMU: teatro, viagens e evangelismos.",
};

export const dynamic = "force-dynamic";

const AgendaPage = async () => {
  const t = await getTranslations("events");

  void trpc.events.listUpcoming.prefetch();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
      <Reveal>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>
      <HydrateClient>
        <ErrorBoundary fallbackTitle="Não foi possível carregar a agenda.">
          <Suspense fallback={<EventsViewSkeleton />}>
            <EventsView />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </div>
  );
};

export default AgendaPage;
