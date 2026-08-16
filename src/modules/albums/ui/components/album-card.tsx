import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PublishedAlbumCard } from "@/modules/albums/types";

export const AlbumCard = ({
  album,
  href,
}: {
  album: Pick<
    PublishedAlbumCard,
    "id" | "title" | "description" | "coverImageUrl" | "photoCount" | "publishedChildCount"
  >;
  href?: string;
}) => {
  const t = useTranslations("albums");

  return (
    <Link
      href={href ?? `/albuns/${album.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border transition-shadow duration-300 hover:shadow-md"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {album.coverImageUrl ? (
          <Image
            src={album.coverImageUrl}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-10" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-semibold">{album.title}</h3>
        {album.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {album.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("photoCount", { count: album.photoCount ?? 0 })}
          {album.publishedChildCount
            ? ` · ${t("childCount", { count: album.publishedChildCount })}`
            : null}
        </p>
      </div>
    </Link>
  );
};
