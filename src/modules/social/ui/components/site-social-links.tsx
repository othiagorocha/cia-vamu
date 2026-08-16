"use client";

import { cn } from "@/lib/utils";
import { getSocialIcon } from "@/modules/social/icons";
import { trpc } from "@/trpc/client";

type SiteSocialLinksProps = {
  variant?: "labels" | "icons";
  className?: string;
};

export const SiteSocialLinks = ({
  variant = "labels",
  className,
}: SiteSocialLinksProps) => {
  const { data } = trpc.social.listPublished.useQuery();

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center",
        variant === "icons" ? "gap-1" : "gap-3",
        className,
      )}
    >
      {data.map((link) => {
        const Icon = getSocialIcon(link.platform, link.iconName);

        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className={cn(
              "inline-flex items-center text-muted-foreground transition-colors hover:text-foreground",
              variant === "icons" &&
                "size-9 justify-center rounded-full hover:bg-muted",
              variant === "labels" && "gap-2 text-sm",
            )}
          >
            <Icon className="size-4" />
            {variant === "labels" ? link.label : null}
          </a>
        );
      })}
    </div>
  );
};
