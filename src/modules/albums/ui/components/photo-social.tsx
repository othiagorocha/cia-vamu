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
    return <div className="min-h-48 flex-1 bg-black" />;
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
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-neutral-950 text-white">
      <div className="shrink-0 space-y-3 border-b border-white/10 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            aria-pressed={data.liked}
            className={
              data.liked
                ? "h-11 gap-2 bg-orange-400 text-black hover:bg-orange-400/90"
                : "h-11 gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            }
            variant={data.liked ? "default" : "outline"}
            onClick={() => likeMutation.mutate({ photoId })}
          >
            <HeartIcon
              className={data.liked ? "size-5 fill-current" : "size-5"}
            />
            {data.liked ? t("liked") : t("like")}
            {data.likeCount > 0 ? (
              <span className="tabular-nums opacity-80">({data.likeCount})</span>
            ) : null}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11 gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={focusComment}
          >
            <MessageCircleIcon className="size-5" />
            {t("comment")}
            {comments.length > 0 ? (
              <span className="tabular-nums opacity-80">({comments.length})</span>
            ) : null}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {data.likers.length > 0 ? (
            <div className="flex -space-x-2">
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
          <p className="text-white/80">{likeSummary()}</p>
        </div>
        {createdAt ? (
          <p className="text-xs text-white/45">
            {formatDistanceToNow(createdAt, { locale: ptBR, addSuffix: true })}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
          {t("comments")}
        </p>
        {caption ? (
          <p className="whitespace-pre-wrap text-white/90">{caption}</p>
        ) : null}
        {comments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center text-white/50">
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
        className="shrink-0 border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim()) return;
          commentMutation.mutate({ photoId, body });
        }}
      >
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10 focus-within:ring-orange-400/60">
          <Input
            ref={inputRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("addComment")}
            className="h-9 border-0 bg-transparent text-white shadow-none placeholder:text-white/45 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || commentMutation.isPending}
            className="rounded-full bg-orange-400 text-black hover:bg-orange-400/90 disabled:bg-orange-400/30 disabled:text-black/50"
          >
            {t("post")}
          </Button>
        </div>
      </form>
    </div>
  );
};
