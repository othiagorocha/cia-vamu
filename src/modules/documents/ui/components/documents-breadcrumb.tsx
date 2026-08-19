"use client";

import Link from "next/link";
import { ChevronRightIcon, FilesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { DocumentBreadcrumb } from "@/modules/documents/types";

type DocumentsBreadcrumbProps = {
  ancestors: DocumentBreadcrumb[];
};

export const DocumentsBreadcrumb = ({ ancestors }: DocumentsBreadcrumbProps) => {
  const t = useTranslations("documents");
  const current = ancestors.at(-1);
  const parents = ancestors.slice(0, -1);

  return (
    <nav
      aria-label={t("breadcrumb")}
      className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/40 px-2 py-1.5 text-sm"
    >
      {current ? (
        <Link
          href="/admin/documentos"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <FilesIcon className="size-3.5" />
          {t("root")}
        </Link>
      ) : (
        <span
          aria-current="page"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-background px-2 py-1 font-medium text-foreground ring-1 ring-border"
        >
          <FilesIcon className="size-3.5 text-orange-400" />
          {t("root")}
        </span>
      )}

      {parents.map((crumb) => (
        <span key={crumb.id} className="flex min-w-0 items-center gap-1">
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <Link
            href={`/admin/documentos/${crumb.id}`}
            className="truncate rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            {crumb.name}
          </Link>
        </span>
      ))}

      {current ? (
        <span className="flex min-w-0 items-center gap-1">
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <span
            aria-current="page"
            className={cn(
              "truncate rounded-md bg-background px-2 py-1 font-medium text-foreground ring-1 ring-border",
            )}
          >
            {current.name}
          </span>
        </span>
      ) : null}
    </nav>
  );
};
