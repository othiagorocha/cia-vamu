"use client";

import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { PhotoRecord } from "@/modules/albums/types";

type PhotoLightboxProps = {
  photos: PhotoRecord[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

export const PhotoLightbox = ({
  photos,
  index,
  onIndexChange,
}: PhotoLightboxProps) => {
  const open = index !== null;
  const photo = index !== null ? photos[index] : null;

  const goTo = (delta: number) => {
    if (index === null) return;
    const next = (index + delta + photos.length) % photos.length;
    onIndexChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onIndexChange(null)}>
      <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none sm:max-w-3xl">
        <DialogTitle className="sr-only">
          {photo?.caption ?? "Foto do álbum"}
        </DialogTitle>
        {photo && (
          <div className="relative flex items-center justify-center">
            <div className="relative aspect-square w-full sm:aspect-4/3">
              <Image
                src={photo.imageUrl}
                alt={photo.caption ?? "Foto do álbum"}
                fill
                className="rounded-lg object-contain"
                sizes="100vw"
              />
            </div>
            {photos.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                  onClick={() => goTo(-1)}
                  aria-label="Foto anterior"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                  onClick={() => goTo(1)}
                  aria-label="Próxima foto"
                >
                  <ChevronRightIcon />
                </Button>
              </>
            )}
            {photo.caption && (
              <p className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {photo.caption}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
