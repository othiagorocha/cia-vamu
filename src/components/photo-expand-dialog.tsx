"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type PhotoExpandDialogProps = {
  src: string | null;
  alt: string;
  onClose: () => void;
};

export const PhotoExpandDialog = ({
  src,
  alt,
  onClose,
}: PhotoExpandDialogProps) => {
  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        closeButtonPlacement="viewport"
        overlayClassName="bg-black/90 backdrop-blur-none"
        className="flex w-auto max-h-dvh max-w-[min(96vw,90dvh)] items-center justify-center border-none bg-transparent p-4 shadow-none ring-0 sm:max-w-[min(96vw,90dvh)]"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="max-h-[min(90dvh,90vw)] max-w-[min(90dvh,90vw)] rounded-full object-cover"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
