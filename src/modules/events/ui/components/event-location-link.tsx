"use client";

import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { googleMapsSearchUrl } from "@/lib/google-maps-url";
import { cn } from "@/lib/utils";

type EventLocationLinkProps = {
  location: string;
  className?: string;
  iconClassName?: string;
};

export const EventLocationLink = ({
  location,
  className,
  iconClassName,
}: EventLocationLinkProps) => {
  const t = useTranslations("events");

  return (
    <a
      href={googleMapsSearchUrl(location)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex max-w-full items-start gap-1.5 text-muted-foreground transition-colors hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={t("openInMaps", { location })}
    >
      <MapPinIcon className={cn("mt-0.5 size-3.5 shrink-0", iconClassName)} />
      <span className="line-clamp-1">{location}</span>
    </a>
  );
};
