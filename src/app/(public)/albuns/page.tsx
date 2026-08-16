import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { Reveal } from "@/components/reveal";
import {
  AlbumsView,
  AlbumsViewSkeleton,
} from "@/modules/albums/ui/views/albums-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Álbuns",
  description: "Fotos do trabalho da CIA VAMU organizadas por álbum.",
};

export const dynamic = "force-dynamic";

const AlbumsPage = async () => {
  const t = await getTranslations("albums");

  void trpc.albums.listPublished.prefetch();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16">
      <Reveal>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>
      <HydrateClient>
        <ErrorBoundary fallbackTitle="Não foi possível carregar os álbuns.">
          <Suspense fallback={<AlbumsViewSkeleton />}>
            <AlbumsView />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </div>
  );
};

export default AlbumsPage;
