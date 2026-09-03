"use client";

import { useTranslations } from "next-intl";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AlbumCard } from "@/modules/albums/ui/components/album-card";
import type { PublishedAlbumCard } from "@/modules/albums/types";

type FeaturedAlbumsSliderProps = {
  albums: PublishedAlbumCard[];
  childrenByParent: Map<string, PublishedAlbumCard[]>;
};

export const FeaturedAlbumsSlider = ({
  albums,
  childrenByParent,
}: FeaturedAlbumsSliderProps) => {
  const t = useTranslations("home.albums");
  const showControls = albums.length > 1;

  return (
    <Carousel
      opts={{ align: "start", containScroll: "trimSnaps" }}
      className="flex w-full items-center gap-2 sm:gap-3"
    >
      {showControls ? (
        <CarouselPrevious
          size="icon"
          aria-label={t("previous")}
          className="static inset-auto size-8 shrink-0"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <CarouselContent>
          {albums.map((album) => (
            <CarouselItem
              key={album.id}
              className="basis-[85%] sm:basis-1/2 lg:basis-1/3"
            >
              <AlbumCard
                album={album}
                childAlbums={childrenByParent.get(album.id) ?? []}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </div>

      {showControls ? (
        <CarouselNext
          size="icon"
          aria-label={t("next")}
          className="static inset-auto size-8 shrink-0"
        />
      ) : null}
    </Carousel>
  );
};
