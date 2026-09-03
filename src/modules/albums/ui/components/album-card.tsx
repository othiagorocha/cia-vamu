import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PublishedAlbumCard } from "@/modules/albums/types";

type AlbumCardAlbum = Pick<
  PublishedAlbumCard,
  "id" | "title" | "coverImageUrl" | "photoCount" | "publishedChildCount"
>;

type AlbumCardChild = Pick<
  PublishedAlbumCard,
  "id" | "title" | "coverImageUrl"
>;

export const AlbumCard = ({
  album,
  href,
  childAlbums = [],
}: {
  album: AlbumCardAlbum;
  href?: string;
  childAlbums?: AlbumCardChild[];
}) => {
  const t = useTranslations("albums");
  const albumHref = href ?? `/albuns/${album.id}`;
  const childCount = childAlbums.length || album.publishedChildCount || 0;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border transition-shadow duration-300 hover:shadow-md">
      <Link
        href={albumHref}
        className="group flex min-w-0 flex-1 flex-col"
        aria-label={t("openAlbum", { title: album.title })}
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
          {album.coverImageUrl ? (
            <Image
              src={album.coverImageUrl}
              alt={album.title}
              fill
              className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
              sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-10" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div className="flex flex-col gap-1 p-3">
          <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold">
            {album.title}
          </h3>
          <p className="text-xs tabular-nums text-muted-foreground">
            {t("photoCount", { count: Number(album.photoCount ?? 0) })}
            {childCount
              ? ` · ${t("childCount", { count: childCount })}`
              : null}
          </p>
        </div>
      </Link>

      {childAlbums.length > 0 ? (
        <div className="mt-auto border-t border-foreground/10 bg-muted/40 px-2 py-2">
          <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("childrenTitle")}
            <span className="ml-1 tabular-nums normal-case tracking-normal">
              ({childAlbums.length})
            </span>
          </p>
          <ul className="mt-1 flex flex-col">
            {childAlbums.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/albuns/${child.id}`}
                  aria-label={t("openAlbum", { title: child.title })}
                  className="flex min-h-11 min-w-0 items-center gap-2 rounded-md px-1 hover:bg-background/80"
                >
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-md bg-muted">
                    {child.coverImageUrl ? (
                      <Image
                        src={child.coverImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="size-3.5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {child.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
};
