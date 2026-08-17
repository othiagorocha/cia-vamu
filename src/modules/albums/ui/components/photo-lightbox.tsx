"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
        className={cn(
          "flex max-h-dvh flex-col items-stretch justify-center gap-0 overflow-hidden border-none bg-transparent p-0 shadow-none ring-0",
          footer
            ? "top-0 left-0 h-dvh w-full max-w-[100vw] translate-x-0 translate-y-0 rounded-none sm:max-w-[100vw] md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(94dvh,100dvh)] md:w-auto md:max-w-[min(96vw,72rem)] md:-translate-x-1/2 md:-translate-y-1/2"
            : "w-auto max-h-[min(94dvh,100dvh)] max-w-[min(96vw,72rem)] items-center sm:max-w-[min(96vw,72rem)]",
        )}
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
                ? "relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-black md:h-auto md:max-h-[min(92dvh,100dvh)] md:w-auto md:max-w-6xl md:flex-row md:rounded-lg"
                : "relative flex max-h-[min(92dvh,100dvh)] w-auto flex-col items-center justify-center"
            }
          >
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
              <Image
                key={photo.id}
                src={photo.imageUrl}
                alt={caption}
                width={2400}
                height={1600}
                className={
                  footer
                    ? "photo-fade h-auto max-h-full w-auto max-w-full object-contain md:max-h-[min(92dvh,100dvh)]"
                    : "photo-fade max-h-[min(88dvh,100dvh)] w-auto max-w-[min(96vw,100vw)] object-contain"
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
              <div className="z-10 flex w-full shrink-0 flex-col rounded-t-2xl border-t border-white/10 shadow-[0_-12px_32px_rgba(0,0,0,0.45)] md:max-h-[min(92dvh,100dvh)] md:w-105 md:rounded-none md:border-l md:border-t-0 md:shadow-none">
                {footer}
              </div>
            ) : photo.caption ? (
              <p
                key={`${photo.id}-caption`}
                className="photo-fade mt-2 max-w-2xl px-4 text-center text-sm text-white"
              >
                {photo.caption}
              </p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
