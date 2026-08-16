"use client";

import { useTranslations } from "next-intl";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AboutMemberCard } from "@/modules/about/ui/components/about-member-card";
import type { PublicMember } from "@/modules/members/types";

type AboutMembersSliderProps = {
  members: PublicMember[];
};

export const AboutMembersSlider = ({ members }: AboutMembersSliderProps) => {
  const t = useTranslations("about.members");
  const showControls = members.length > 1;

  return (
    <Carousel
      opts={{ align: "start", containScroll: "trimSnaps" }}
      className="flex w-full items-center gap-2 sm:gap-3"
    >
      {showControls ? (
        <CarouselPrevious
          size="icon"
          aria-label={t("previous")}
          className="static inset-auto size-8 shrink-0"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <CarouselContent>
          {members.map((member) => (
            <CarouselItem
              key={member.userId}
              className="basis-[75%] sm:basis-1/2 lg:basis-1/3"
            >
              <AboutMemberCard member={member} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </div>

      {showControls ? (
        <CarouselNext
          size="icon"
          aria-label={t("next")}
          className="static inset-auto size-8 shrink-0"
        />
      ) : null}
    </Carousel>
  );
};
