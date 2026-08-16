"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { PhotoRecord } from "@/modules/albums/types";

type PhotoLightboxProps = {
  photos: PhotoRecord[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  footer?: ReactNode;
};

export const PhotoLightbox = ({
  photos,
  index,
  onIndexChange,
  footer,
}: PhotoLightboxProps) => {
  const open = index !== null;
  const photo = index !== null ? photos[index] : null;
  const caption = photo?.caption ?? photo?.title ?? "Foto do álbum";

  const goTo = (delta: number) => {
    if (index === null) return;
    const next = (index + delta + photos.length) % photos.length;
    onIndexChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onIndexChange(null)}>
      <DialogContent
        showCloseButton
        closeButtonPlacement="viewport"
        overlayClassName="bg-black/90 backdrop-blur-none"
        className="flex w-auto max-h-[min(94dvh,100dvh)] max-w-[min(96vw,72rem)] flex-col items-center justify-center gap-0 border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-[min(96vw,72rem)]"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onIndexChange(null);
          }
        }}
      >
        <DialogTitle className="sr-only">{caption}</DialogTitle>
        {photo && (
          <div
            className={
              footer
                ? "relative flex max-h-[min(92dvh,100dvh)] w-auto max-w-6xl flex-col overflow-hidden bg-black md:flex-row md:rounded-lg"
                : "relative flex max-h-[min(92dvh,100dvh)] w-auto flex-col items-center justify-center"
            }
          >
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
              <Image
                src={photo.imageUrl}
                alt={caption}
                width={2400}
                height={1600}
                className={
                  footer
                    ? "max-h-[min(55dvh,100dvh)] w-auto max-w-full object-contain md:max-h-[min(92dvh,100dvh)]"
                    : "max-h-[min(88dvh,100dvh)] w-auto max-w-[min(96vw,100vw)] object-contain"
                }
                sizes="100vw"
                priority
              />
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
            </div>
            {footer ? (
              <div className="flex max-h-[48dvh] w-full shrink-0 flex-col border-t border-white/10 md:max-h-[min(92dvh,100dvh)] md:w-105 md:border-l md:border-t-0">
                {footer}
              </div>
            ) : photo.caption ? (
              <p className="mt-2 max-w-2xl px-4 text-center text-sm text-white">
                {photo.caption}
              </p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
