"use client";

import Link from "next/link";
import { ArrowRightIcon, ImagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { FeaturedAlbumsSlider } from "@/modules/home/ui/components/featured-albums-slider";
import { trpc } from "@/trpc/client";

const HOME_ALBUMS_LIMIT = 12;

export const FeaturedAlbums = () => {
  const t = useTranslations("home.albums");
  const tCommon = useTranslations("common");
  const [albums] = trpc.albums.listPublished.useSuspenseQuery();
  const featured = albums.slice(0, HOME_ALBUMS_LIMIT);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16">
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
        <Reveal>
          <FeaturedAlbumsSlider albums={featured} />
        </Reveal>
      )}
    </section>
  );
};

export const FeaturedAlbumsSkeleton = () => {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="aspect-4/3 min-w-0 flex-1 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </section>
  );
};
