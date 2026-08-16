"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal, revealDelay } from "@/components/reveal";
import { AlbumCard } from "@/modules/albums/ui/components/album-card";
import { PhotoLightbox } from "@/modules/albums/ui/components/photo-lightbox";
import { trpc } from "@/trpc/client";

export const AlbumDetailView = ({ albumId }: { albumId: string }) => {
  const t = useTranslations("albums");
  const [album] = trpc.albums.getPublicById.useSuspenseQuery({ id: albumId });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{album.title}</h1>
          {album.description && (
            <p className="max-w-2xl text-muted-foreground">{album.description}</p>
          )}
        </div>
      </Reveal>

      {album.children.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {album.children.map((child, index) => (
            <Reveal key={child.id} delayMs={revealDelay(index)} className="h-full">
              <AlbumCard
                album={{
                  ...child,
                  photoCount: 0,
                  publishedChildCount: 0,
                }}
              />
            </Reveal>
          ))}
        </div>
      ) : null}

      {album.photos.length === 0 ? (
        <Reveal>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
            <ImageOffIcon className="size-10" />
            <p>{t("emptyPhotos")}</p>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {album.photos.map((photo, index) => (
            <Reveal key={photo.id} delayMs={revealDelay(index)}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group relative aspect-square w-full overflow-hidden rounded-lg bg-muted"
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.caption ?? album.title}
                  fill
                  className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
              </button>
            </Reveal>
          ))}
        </div>
      )}

      <PhotoLightbox
        photos={album.photos}
        index={activeIndex}
        onIndexChange={setActiveIndex}
      />
    </div>
  );
};

export const AlbumDetailViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-9 w-64 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
