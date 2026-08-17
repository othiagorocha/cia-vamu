"use client";

import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  HeartIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

const Face = ({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) => {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className={cn("size-8 shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-medium",
        className,
      )}
    >
      {initial}
    </span>
  );
};

export const PhotoSocial = ({
  photoId,
  caption,
  createdAt,
  canModerate,
}: {
  photoId: string;
  caption?: string | null;
  createdAt?: Date;
  canModerate: boolean;
}) => {
  const t = useTranslations("albums");
  const utils = trpc.useUtils();
  const [body, setBody] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data } = trpc.albums.photoSocial.useQuery({ photoId });

  const invalidate = () => {
    utils.albums.photoSocial.invalidate({ photoId });
  };

  const likeMutation = trpc.albums.toggleLike.useMutation({
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });

  const commentMutation = trpc.albums.addComment.useMutation({
    onSuccess: () => {
      setBody("");
      setCommentsOpen(true);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const hideMutation = trpc.albums.hideComment.useMutation({
    onSuccess: invalidate,
  });
  const restoreMutation = trpc.albums.restoreComment.useMutation({
    onSuccess: invalidate,
  });
  const deleteMutation = trpc.albums.deleteComment.useMutation({
    onSuccess: invalidate,
  });

  if (!data) {
    return <div className="h-28 bg-neutral-950 md:min-h-48 md:flex-1" />;
  }

  const comments = data.comments.filter(
    (comment) => canModerate || !comment.deletedAt,
  );
  const previewLiker = data.likers[0];
  const othersCount = Math.max(0, data.likeCount - 1);

  const likeSummary = () => {
    if (data.likeCount === 0) {
      return t("beFirstLike");
    }

    if (data.liked && data.likeCount === 1) {
      return t("likedByYou");
    }

    if (data.liked && othersCount > 0) {
      return t("likedByYouAnd", { count: othersCount });
    }

    if (previewLiker && data.likeCount === 1) {
      return t("likedBy", { name: previewLiker.name });
    }

    if (previewLiker && othersCount > 0) {
      return t("likedByOthers", { name: previewLiker.name, count: othersCount });
    }

    return t("likeCount", { count: data.likeCount });
  };

  const focusComment = () => {
    setCommentsOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: "nearest" });
    });
  };

  return (
    <div className="flex min-h-0 flex-col bg-neutral-950 text-white md:h-full md:flex-1">
      <button
        type="button"
        className="flex w-full shrink-0 flex-col items-center pt-2 pb-1 md:hidden"
        aria-expanded={commentsOpen}
        aria-label={commentsOpen ? t("collapseComments") : t("viewComments")}
        onClick={() => setCommentsOpen((open) => !open)}
      >
        <span className="h-1 w-10 rounded-full bg-white/30" />
      </button>

      <div className="shrink-0 space-y-2 px-4 pb-3 md:space-y-3 md:border-b md:border-white/10 md:pt-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            aria-pressed={data.liked}
            className={
              data.liked
                ? "h-10 min-w-0 gap-1.5 bg-orange-400 px-3 text-black hover:bg-orange-400/90 md:h-11"
                : "h-10 min-w-0 gap-1.5 border-white/20 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white md:h-11"
            }
            variant={data.liked ? "default" : "outline"}
            onClick={() => likeMutation.mutate({ photoId })}
          >
            <HeartIcon
              className={data.liked ? "size-5 fill-current" : "size-5"}
            />
            <span className="truncate">
              {data.liked ? t("liked") : t("like")}
            </span>
            {data.likeCount > 0 ? (
              <span className="tabular-nums opacity-80">({data.likeCount})</span>
            ) : null}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-10 min-w-0 gap-1.5 border-white/20 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white md:h-11"
            onClick={focusComment}
          >
            <MessageCircleIcon className="size-5" />
            <span className="truncate">{t("comment")}</span>
            {comments.length > 0 ? (
              <span className="tabular-nums opacity-80">({comments.length})</span>
            ) : null}
          </Button>
        </div>
        <div className="flex min-w-0 items-start gap-2 text-xs md:text-sm">
          {data.likers.length > 0 ? (
            <div className="flex shrink-0 -space-x-2 pt-0.5">
              {data.likers.map((liker) => (
                <Face
                  key={liker.userId}
                  name={liker.name}
                  photoUrl={liker.photoUrl}
                  className="size-6 ring-2 ring-neutral-950"
                />
              ))}
            </div>
          ) : null}
          <p className="min-w-0 flex-1 text-pretty text-white/80">
            {likeSummary()}
          </p>
        </div>
        {createdAt ? (
          <p className="text-xs text-white/45">
            {formatDistanceToNow(createdAt, { locale: ptBR, addSuffix: true })}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "min-h-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 text-sm md:flex-1 md:space-y-4 md:max-h-none",
          commentsOpen ? "max-h-[min(38dvh,18rem)] border-t border-white/10" : "hidden md:block",
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
          {t("comments")}
        </p>
        {caption ? (
          <p className="whitespace-pre-wrap text-white/90">{caption}</p>
        ) : null}
        {comments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 px-3 py-3 text-center text-white/50 md:py-6">
            {t("emptyComments")}
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Face name={comment.authorName} photoUrl={comment.authorPhotoUrl} />
              <div className="min-w-0 flex-1">
                <p className={comment.deletedAt ? "text-white/50" : ""}>
                  <span className="font-semibold">{comment.authorName} </span>
                  {comment.body}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  {formatDistanceToNow(comment.createdAt, {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </p>
              </div>
              {canModerate ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={t("commentActions")}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/50 outline-none hover:bg-white/10 hover:text-white"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {comment.deletedAt ? (
                      <DropdownMenuItem
                        onClick={() => restoreMutation.mutate({ id: comment.id })}
                      >
                        {t("restore")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => hideMutation.mutate({ id: comment.id })}
                      >
                        {t("hiddenComment")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteMutation.mutate({ id: comment.id })}
                    >
                      {t("deleteForever")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ))
        )}
      </div>

      <form
        className="shrink-0 border-t border-white/10 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim()) return;
          commentMutation.mutate({ photoId, body });
        }}
      >
        <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 py-1 pl-3 pr-1 ring-1 ring-white/10 focus-within:ring-orange-400/60">
          <Input
            ref={inputRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("addComment")}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-white shadow-none placeholder:text-white/45 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || commentMutation.isPending}
            className="shrink-0 rounded-full bg-orange-400 px-3 text-black hover:bg-orange-400/90 disabled:bg-orange-400/30 disabled:text-black/50"
          >
            {t("post")}
          </Button>
        </div>
      </form>
    </div>
  );
};
