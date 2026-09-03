import Image from "next/image";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type AlbumCoverProps = {
  src?: string | null;
  alt?: string;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  hideCover?: boolean;
};

export const AlbumCover = ({
  src,
  alt = "",
  sizes,
  className,
  imageClassName,
  hideCover = false,
}: AlbumCoverProps) => {
  const showDefault = !src && !hideCover;

  return (
    <span
      className={cn(
        "relative block overflow-hidden",
        showDefault || src ? "bg-black" : "bg-muted",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn("object-cover", imageClassName)}
          sizes={sizes}
        />
      ) : showDefault ? (
        <span className="flex size-full items-center justify-center p-[18%]">
          <Logo variant="white" className="size-full max-h-full" />
        </span>
      ) : null}
    </span>
  );
};
