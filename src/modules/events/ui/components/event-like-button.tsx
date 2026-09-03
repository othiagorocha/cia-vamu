"use client";

import { HeartIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEventLike } from "@/modules/events/ui/hooks/use-event-like";

type EventLikeButtonProps = {
  eventId: string;
  liked: boolean;
  likeCount: number;
  variant?: "compact" | "action";
  className?: string;
  onPointerDown?: (event: { stopPropagation: () => void }) => void;
};

const LikeHeart = ({
  liked,
  popping,
  className,
}: {
  liked: boolean;
  popping: boolean;
  className?: string;
}) => (
  <span className="relative inline-flex items-center justify-center">
    <HeartIcon
      className={cn(
        className,
        popping && "prayer-react-pop",
        liked && "fill-current",
      )}
    />
    {popping ? (
      <>
        <span className="prayer-react-spark prayer-react-spark-1" />
        <span className="prayer-react-spark prayer-react-spark-2" />
        <span className="prayer-react-spark prayer-react-spark-3" />
        <span className="prayer-react-spark prayer-react-spark-4" />
        <span className="prayer-react-spark prayer-react-spark-5" />
      </>
    ) : null}
  </span>
);

export const EventLikeButton = ({
  eventId,
  liked,
  likeCount,
  variant = "compact",
  className,
  onPointerDown,
}: EventLikeButtonProps) => {
  const t = useTranslations("events.social");
  const { toggle, popping, isPending } = useEventLike(eventId);

  const handleClick = () => {
    toggle();
  };

  if (variant === "action") {
    return (
      <Button
        type="button"
        size="lg"
        aria-pressed={liked}
        disabled={isPending}
        className={cn(
          liked
            ? "h-10 min-w-0 gap-1.5 bg-orange-400 px-3 text-black hover:bg-orange-400/90"
            : "h-10 min-w-0 gap-1.5",
          className,
        )}
        variant={liked ? "default" : "outline"}
        onClick={handleClick}
      >
        <LikeHeart liked={liked} popping={popping} className="size-5" />
        <span className="truncate">{liked ? t("liked") : t("like")}</span>
        {likeCount > 0 ? (
          <span
            className={cn(
              "tabular-nums opacity-80",
              popping && "event-like-count-pop",
            )}
          >
            ({likeCount})
          </span>
        ) : null}
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? t("liked") : t("like")}
      disabled={isPending}
      title={t("likeCount", { count: likeCount })}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-xs transition-colors sm:text-sm",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
        liked && "bg-orange-400/15 text-orange-400 ring-1 ring-orange-400/40",
        className,
      )}
    >
      <LikeHeart
        liked={liked}
        popping={popping}
        className={cn("size-3.5 shrink-0", liked && "text-orange-400")}
      />
      <span
        className={cn("tabular-nums", popping && "event-like-count-pop")}
      >
        {likeCount}
      </span>
    </button>
  );
};
