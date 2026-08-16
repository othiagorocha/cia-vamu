"use client";

import Link from "next/link";
import { ArrowRightIcon, ImagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal, revealDelay } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { AlbumCard } from "@/modules/albums/ui/components/album-card";
import { trpc } from "@/trpc/client";

export const FeaturedAlbums = () => {
  const t = useTranslations("home.albums");
  const tCommon = useTranslations("common");
  const [albums] = trpc.albums.listPublished.useSuspenseQuery();
  const featured = albums.slice(0, 3);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <Reveal>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/albuns">
              {tCommon("actions.viewAll")}
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </Reveal>

      {featured.length === 0 ? (
        <Reveal>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <ImagesIcon className="size-10" />
            <p>{t("empty")}</p>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((album, index) => (
            <Reveal key={album.id} delayMs={revealDelay(index)} className="h-full">
              <AlbumCard album={album} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
};

export const FeaturedAlbumsSkeleton = () => {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="aspect-4/3 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </section>
  );
};
