"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { PhotoLightbox } from "@/modules/albums/ui/components/photo-lightbox";
import { AlbumCard } from "@/modules/albums/ui/components/album-card";
import { trpc } from "@/trpc/client";

export const AlbumDetailView = ({ albumId }: { albumId: string }) => {
  const t = useTranslations("albums");
  const [album] = trpc.albums.getPublicById.useSuspenseQuery({ id: albumId });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{album.title}</h1>
        {album.description && (
          <p className="max-w-2xl text-muted-foreground">{album.description}</p>
        )}
      </div>

      {album.children.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {album.children.map((child) => (
            <AlbumCard
              key={child.id}
              album={{
                ...child,
                photoCount: 0,
                publishedChildCount: 0,
              }}
            />
          ))}
        </div>
      ) : null}

      {album.photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          <ImageOffIcon className="size-10" />
          <p>{t("emptyPhotos")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {album.photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              <Image
                src={photo.imageUrl}
                alt={photo.caption ?? album.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
            </button>
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
