import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";

import type { AlbumRecord } from "@/modules/albums/types";

export const AlbumCard = ({ album }: { album: AlbumRecord }) => {
  return (
    <Link
      href={`/albuns/${album.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {album.coverImageUrl ? (
          <Image
            src={album.coverImageUrl}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-10" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-semibold">{album.title}</h3>
        {album.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {album.description}
          </p>
        )}
      </div>
    </Link>
  );
};
