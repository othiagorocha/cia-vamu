"use client";

import { ImagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal, revealDelay } from "@/components/reveal";
import { groupAlbumsByParent } from "@/modules/albums/group-albums";
import { AlbumCard } from "@/modules/albums/ui/components/album-card";
import { trpc } from "@/trpc/client";

const ALBUM_GRID_CLASS =
  "grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]";

export const AlbumsView = () => {
  const t = useTranslations("albums");
  const [albums] = trpc.albums.listPublished.useSuspenseQuery();
  const { roots, childrenByParent } = groupAlbumsByParent(albums);

  if (roots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
        <ImagesIcon className="size-10" />
        <p>{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className={ALBUM_GRID_CLASS}>
      {roots.map((album, index) => (
        <Reveal key={album.id} delayMs={revealDelay(index)} className="h-full">
          <AlbumCard
            album={album}
            childAlbums={childrenByParent.get(album.id) ?? []}
          />
        </Reveal>
      ))}
    </div>
  );
};

export const AlbumsViewSkeleton = () => {
  return (
    <div className={ALBUM_GRID_CLASS}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="aspect-4/3 animate-pulse rounded-lg border bg-muted/40"
        />
      ))}
    </div>
  );
};
