"use client";

import { trpc } from "@/trpc/client";
import { getSocialIcon } from "@/modules/social/icons";

export const SiteSocialLinks = () => {
  const { data } = trpc.social.listPublished.useQuery();

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {data.map((link) => {
        const Icon = getSocialIcon(link.platform, link.iconName);

        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Icon className="size-4" />
            {link.label}
          </a>
        );
      })}
    </div>
  );
};
