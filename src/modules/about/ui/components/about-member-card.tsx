"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PhotoExpandDialog } from "@/components/photo-expand-dialog";
import { Logo } from "@/components/logo";
import type { PublicMember } from "@/modules/members/types";

export const AboutMemberCard = ({ member }: { member: PublicMember }) => {
  const t = useTranslations("about.members");
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <article className="flex h-full flex-col items-center gap-3 rounded-lg border p-6 text-center">
        {member.photoUrl ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t("expandPhoto", { name: member.name })}
            className="size-32 shrink-0 overflow-hidden rounded-full outline-none transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:hover:scale-105 sm:size-36"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.photoUrl}
              alt={member.name}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted sm:size-36">
            <Logo variant="orange" className="size-16 sm:size-20" />
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-lg font-semibold leading-snug">{member.name}</h3>
          {member.role ? (
            <p className="text-sm text-orange-400">{member.role}</p>
          ) : null}
        </div>

        {member.testimony ? (
          <p className="line-clamp-4 text-sm text-muted-foreground">
            {member.testimony}
          </p>
        ) : null}
      </article>

      <PhotoExpandDialog
        src={expanded ? member.photoUrl : null}
        alt={member.name}
        onClose={() => setExpanded(false)}
      />
    </>
  );
};
