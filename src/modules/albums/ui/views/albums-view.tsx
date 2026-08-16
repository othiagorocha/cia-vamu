"use client";

import { ImagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal, revealDelay } from "@/components/reveal";
import { AlbumCard } from "@/modules/albums/ui/components/album-card";
import { trpc } from "@/trpc/client";

export const AlbumsView = () => {
  const t = useTranslations("albums");
  const [albums] = trpc.albums.listPublished.useSuspenseQuery();

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
        <ImagesIcon className="size-10" />
        <p>{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((album, index) => (
        <Reveal key={album.id} delayMs={revealDelay(index)} className="h-full">
          <AlbumCard album={album} />
        </Reveal>
      ))}
    </div>
  );
};

export const AlbumsViewSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="aspect-4/3 animate-pulse rounded-lg border bg-muted/40"
        />
      ))}
    </div>
  );
};
