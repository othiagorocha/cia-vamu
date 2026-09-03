"use client";

import Link from "next/link";
import { ChevronRightIcon, ImagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

type AlbumsAdminBreadcrumbProps = {
  album: {
    id: string;
    title: string;
    parent?: { id: string; title: string } | null;
  };
};

export const AlbumsAdminBreadcrumb = ({
  album,
}: AlbumsAdminBreadcrumbProps) => {
  const t = useTranslations("albums");

  return (
    <nav
      aria-label={t("breadcrumb")}
      className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/40 px-2 py-1.5 text-sm"
    >
      <Link
        href="/admin/albums"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <ImagesIcon className="size-3.5" />
        {t("adminTitle")}
      </Link>

      {album.parent ? (
        <span className="flex min-w-0 items-center gap-1">
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <Link
            href={`/admin/albums/${album.parent.id}`}
            className="truncate rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            {album.parent.title}
          </Link>
        </span>
      ) : null}

      <span className="flex min-w-0 items-center gap-1">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        <span
          aria-current="page"
          className="truncate rounded-md bg-background px-2 py-1 font-medium text-foreground ring-1 ring-border"
        >
          {album.title}
        </span>
      </span>
    </nav>
  );
};
