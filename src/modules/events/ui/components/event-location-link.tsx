"use client";

import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { eventMapsHref } from "@/lib/google-maps-url";
import { cn } from "@/lib/utils";

type EventLocationLinkProps = {
  location: string;
  mapsQuery?: string | null;
  className?: string;
  iconClassName?: string;
};

export const EventLocationLink = ({
  location,
  mapsQuery,
  className,
  iconClassName,
}: EventLocationLinkProps) => {
  const t = useTranslations("events");
  const destination = mapsQuery?.trim();
  const content = <span className="line-clamp-1">{location}</span>;

  if (!destination) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full items-start text-muted-foreground/70",
          className,
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <a
      href={eventMapsHref(destination)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex max-w-full items-start gap-1.5 text-muted-foreground transition-colors hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={t("openInMaps", { location })}
    >
      <MapPinIcon className={cn("mt-0.5 size-3.5 shrink-0", iconClassName)} />
      {content}
    </a>
  );
};
