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
import { cn } from "@/lib/utils";
import { useToastError } from "@/lib/use-toast-error";
import {
  CommentBody,
  type CommentMention,
} from "@/modules/events/ui/components/comment-body";
import { MentionComposer } from "@/modules/events/ui/components/mention-composer";
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
  variant = "overlay",
}: {
  photoId: string;
  caption?: string | null;
  createdAt?: Date;
  canModerate: boolean;
  variant?: "overlay" | "card";
}) => {
  const t = useTranslations("albums");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<CommentMention[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(variant === "card");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editMentions, setEditMentions] = useState<CommentMention[]>([]);
  const { data } = trpc.albums.photoSocial.useQuery({ photoId });

  const invalidate = () => {
    utils.albums.photoSocial.invalidate({ photoId });
  };

  const likeMutation = trpc.albums.toggleLike.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });

  const commentMutation = trpc.albums.addComment.useMutation({
    onSuccess: () => {
      setBody("");
      setMentionedUsers([]);
      setCommentsOpen(true);
      invalidate();
    },
    onError: toastError,
  });

  const updateMutation = trpc.albums.updateComment.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setEditBody("");
      setEditMentions([]);
      toast.success(t("commentUpdated"));
      invalidate();
    },
    onError: toastError,
  });

  const hideMutation = trpc.albums.hideComment.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });
  const restoreMutation = trpc.albums.restoreComment.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });
  const deleteMutation = trpc.albums.deleteComment.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setEditBody("");
      setEditMentions([]);
      toast.success(t("commentDeleted"));
      invalidate();
    },
    onError: toastError,
  });

  if (!data) {
    if (variant === "card") {
      return (
        <div className="space-y-2 px-3 py-2">
          <div className="h-8 animate-pulse rounded bg-muted/60" />
          <div className="h-9 animate-pulse rounded bg-muted/40" />
        </div>
      );
    }

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
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ block: "nearest" });
    });
  };

  const submitComment = () => {
    if (!body.trim() || commentMutation.isPending) {
      return;
    }

    commentMutation.mutate({
      photoId,
      body,
      mentionedUserIds: mentionedUsers.map((mention) => mention.userId),
    });
  };

  const startEdit = (comment: {
    id: string;
    body: string;
    mentions: CommentMention[];
  }) => {
    setEditingId(comment.id);
    setEditBody(comment.body);
    setEditMentions(comment.mentions);
    setCommentsOpen(true);
  };

  const isolateCardEvent = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

  if (variant === "card") {
    return (
      <div
        className="flex flex-col border-t border-foreground/10 bg-card"
        onClick={isolateCardEvent}
        onPointerDown={isolateCardEvent}
      >
        <div className="flex flex-wrap items-center gap-1 px-2.5 py-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={data.liked}
            className={cn(
              "h-9 min-w-0 gap-1.5 px-2.5 text-xs",
              data.liked && "text-orange-400",
            )}
            onClick={() => likeMutation.mutate({ photoId })}
          >
            <HeartIcon
              className={cn("size-3.5", data.liked && "fill-current")}
            />
            <span className="truncate">
              {data.liked ? t("liked") : t("like")}
            </span>
            {data.likeCount > 0 ? (
              <span className="tabular-nums opacity-70">{data.likeCount}</span>
            ) : null}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={focusComment}
          >
            <MessageCircleIcon className="size-3.5" />
            <span className="truncate">{t("comment")}</span>
            {comments.length > 0 ? (
              <span className="tabular-nums opacity-70">{comments.length}</span>
            ) : null}
          </Button>
        </div>

        {data.likeCount > 0 ? (
          <p className="px-3 pb-1.5 text-[11px] text-muted-foreground">
            {likeSummary()}
          </p>
        ) : null}

        {comments.length > 0 ? (
          <div className="max-h-36 space-y-2 overflow-y-auto overscroll-contain border-t border-foreground/10 px-3 py-2">
            {comments.map((comment) => {
              const isAuthor = comment.authorId === data.viewerId;
              const canEdit = isAuthor && !comment.deletedAt;
              const showMenu = canEdit || canModerate;

              return (
                <div key={comment.id} className="flex gap-2">
                  <Face
                    name={comment.authorName}
                    photoUrl={comment.authorPhotoUrl}
                    className="size-6 bg-muted text-[10px]"
                  />
                  <div className="min-w-0 flex-1">
                    {editingId === comment.id ? (
                      <form
                        className="flex flex-col gap-1.5"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!editBody.trim()) return;
                          updateMutation.mutate({
                            id: comment.id,
                            body: editBody,
                            mentionedUserIds: editMentions.map(
                              (mention) => mention.userId,
                            ),
                          });
                        }}
                      >
                        <MentionComposer
                          value={editBody}
                          mentionedUsers={editMentions}
                          onChange={(nextBody, nextMentions) => {
                            setEditBody(nextBody);
                            setEditMentions(nextMentions);
                          }}
                          onSubmit={() => {
                            if (!editBody.trim() || updateMutation.isPending) {
                              return;
                            }

                            updateMutation.mutate({
                              id: comment.id,
                              body: editBody,
                              mentionedUserIds: editMentions.map(
                                (mention) => mention.userId,
                              ),
                            });
                          }}
                        />
                        <div className="flex gap-1.5">
                          <Button
                            type="submit"
                            size="sm"
                            className="h-8"
                            disabled={!editBody.trim() || updateMutation.isPending}
                          >
                            {tCommon("actions.save")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => {
                              setEditingId(null);
                              setEditBody("");
                              setEditMentions([]);
                            }}
                          >
                            {tCommon("actions.cancel")}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p
                          className={cn(
                            "text-xs leading-snug",
                            comment.deletedAt && "text-muted-foreground italic",
                          )}
                        >
                          <span className="font-medium">{comment.authorName} </span>
                          <CommentBody
                            body={comment.body}
                            mentions={comment.mentions}
                          />
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                          {formatDistanceToNow(comment.createdAt, {
                            locale: ptBR,
                            addSuffix: true,
                          })}
                        </p>
                      </>
                    )}
                  </div>
                  {showMenu && editingId !== comment.id ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={t("commentActions")}
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit ? (
                          <DropdownMenuItem onClick={() => startEdit(comment)}>
                            {tCommon("actions.edit")}
                          </DropdownMenuItem>
                        ) : null}
                        {canModerate ? (
                          comment.deletedAt ? (
                            <DropdownMenuItem
                              onClick={() =>
                                restoreMutation.mutate({ id: comment.id })
                              }
                            >
                              {t("restore")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                hideMutation.mutate({ id: comment.id })
                              }
                            >
                              {t("hiddenComment")}
                            </DropdownMenuItem>
                          )
                        ) : null}
                        {canEdit || canModerate ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              deleteMutation.mutate({ id: comment.id })
                            }
                          >
                            {canModerate
                              ? t("deleteForever")
                              : tCommon("actions.delete")}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <form
          className="border-t border-foreground/10 px-2.5 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitComment();
          }}
        >
          <div className="flex items-end gap-1.5">
            <MentionComposer
              value={body}
              mentionedUsers={mentionedUsers}
              onChange={(nextBody, nextMentions) => {
                setBody(nextBody);
                setMentionedUsers(nextMentions);
              }}
              placeholder={t("addComment")}
              className="min-w-0 flex-1"
              inputRef={composerRef}
              onSubmit={submitComment}
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 shrink-0"
              disabled={!body.trim() || commentMutation.isPending}
            >
              {t("post")}
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            {t("mentionHint")}
          </p>
        </form>
      </div>
    );
  }

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
          comments.map((comment) => {
            const isAuthor = comment.authorId === data.viewerId;
            const canEdit = isAuthor && !comment.deletedAt;
            const showMenu = canEdit || canModerate;

            return (
            <div key={comment.id} className="flex gap-3">
              <Face name={comment.authorName} photoUrl={comment.authorPhotoUrl} />
              <div className="min-w-0 flex-1">
                {editingId === comment.id ? (
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!editBody.trim()) return;
                      updateMutation.mutate({
                        id: comment.id,
                        body: editBody,
                        mentionedUserIds: editMentions.map(
                          (mention) => mention.userId,
                        ),
                      });
                    }}
                  >
                    <MentionComposer
                      value={editBody}
                      mentionedUsers={editMentions}
                      onChange={(nextBody, nextMentions) => {
                        setEditBody(nextBody);
                        setEditMentions(nextMentions);
                      }}
                      onSubmit={() => {
                        if (!editBody.trim() || updateMutation.isPending) {
                          return;
                        }

                        updateMutation.mutate({
                          id: comment.id,
                          body: editBody,
                          mentionedUserIds: editMentions.map(
                            (mention) => mention.userId,
                          ),
                        });
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!editBody.trim() || updateMutation.isPending}
                        className="rounded-full bg-orange-400 text-black hover:bg-orange-400/90"
                      >
                        {tCommon("actions.save")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-white/70 hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setEditingId(null);
                          setEditBody("");
                          setEditMentions([]);
                        }}
                      >
                        {tCommon("actions.cancel")}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className={comment.deletedAt ? "text-white/50" : ""}>
                      <span className="font-semibold">{comment.authorName} </span>
                      <CommentBody
                        body={comment.body}
                        mentions={comment.mentions}
                      />
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {formatDistanceToNow(comment.createdAt, {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </p>
                  </>
                )}
              </div>
              {showMenu && editingId !== comment.id ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={t("commentActions")}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/50 outline-none hover:bg-white/10 hover:text-white"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit ? (
                      <DropdownMenuItem onClick={() => startEdit(comment)}>
                        {tCommon("actions.edit")}
                      </DropdownMenuItem>
                    ) : null}
                    {canModerate ? (
                      comment.deletedAt ? (
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
                      )
                    ) : null}
                    {canEdit || canModerate ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => deleteMutation.mutate({ id: comment.id })}
                      >
                        {canModerate ? t("deleteForever") : tCommon("actions.delete")}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            );
          })
        )}
      </div>

      <form
        className="shrink-0 border-t border-white/10 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          submitComment();
        }}
      >
        <div className="flex items-end gap-1.5">
          <MentionComposer
            value={body}
            mentionedUsers={mentionedUsers}
            onChange={(nextBody, nextMentions) => {
              setBody(nextBody);
              setMentionedUsers(nextMentions);
            }}
            placeholder={t("addComment")}
            className="min-w-0 flex-1"
            inputRef={composerRef}
            onSubmit={submitComment}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || commentMutation.isPending}
            className="h-9 shrink-0 rounded-full bg-orange-400 px-3 text-black hover:bg-orange-400/90 disabled:bg-orange-400/30 disabled:text-black/50"
          >
            {t("post")}
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-white/50">{t("mentionHint")}</p>
      </form>
    </div>
  );
};
