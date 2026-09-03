"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
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
import { EventLikeButton } from "@/modules/events/ui/components/event-like-button";
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
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium",
        className,
      )}
    >
      {initial}
    </span>
  );
};

export const EventSocial = ({
  eventId,
  canModerate,
  focusComposerOnMount = false,
}: {
  eventId: string;
  canModerate: boolean;
  focusComposerOnMount?: boolean;
}) => {
  const t = useTranslations("events.social");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<CommentMention[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editMentions, setEditMentions] = useState<CommentMention[]>([]);

  const { data } = trpc.events.eventSocial.useQuery({ eventId });

  const focusComment = () => {
    setCommentsOpen(true);
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ block: "nearest" });
    });
  };

  useEffect(() => {
    if (!focusComposerOnMount || !data) {
      return;
    }

    const id = window.setTimeout(() => focusComment(), 50);
    return () => window.clearTimeout(id);
  }, [focusComposerOnMount, data]);

  const invalidate = () => {
    void utils.events.eventSocial.invalidate({ eventId });
  };

  const commentMutation = trpc.events.addComment.useMutation({
    onSuccess: () => {
      setBody("");
      setMentionedUsers([]);
      setCommentsOpen(true);
      invalidate();
    },
    onError: toastError,
  });

  const updateMutation = trpc.events.updateComment.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setEditBody("");
      setEditMentions([]);
      toast.success(t("commentUpdated"));
      invalidate();
    },
    onError: toastError,
  });

  const hideMutation = trpc.events.hideComment.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });

  const restoreMutation = trpc.events.restoreComment.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });

  const deleteMutation = trpc.events.deleteComment.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setEditBody("");
      setEditMentions([]);
      toast.success(t("commentDeleted"));
      invalidate();
    },
    onError: toastError,
  });

  const submitComment = () => {
    if (!body.trim() || commentMutation.isPending) {
      return;
    }

    commentMutation.mutate({
      eventId,
      body,
      mentionedUserIds: mentionedUsers.map((mention) => mention.userId),
    });
  };

  if (!data) {
    return <div className="h-24 animate-pulse rounded-lg bg-muted/40" />;
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

  return (
    <div className="flex min-h-0 flex-col border-t border-foreground/10">
      <button
        type="button"
        className="flex w-full shrink-0 flex-col items-center pt-1.5 pb-0.5 sm:hidden"
        aria-expanded={commentsOpen}
        aria-label={commentsOpen ? t("collapseComments") : t("viewComments")}
        onClick={() => setCommentsOpen((open) => !open)}
      >
        <span className="h-1 w-8 rounded-full bg-muted-foreground/30" />
      </button>

      <div className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1 px-5 py-2">
        <EventLikeButton
          eventId={eventId}
          liked={data.liked}
          likeCount={data.likeCount}
          variant="compact"
          className="min-h-9 min-w-0 gap-1.5 px-2.5 text-xs"
        />
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
        {data.likeCount > 0 ? (
          <p className="min-w-0 flex-1 basis-full text-xs text-muted-foreground sm:basis-auto sm:pl-1">
            {likeSummary()}
          </p>
        ) : null}
      </div>

      {comments.length > 0 ? (
        <div
          className={cn(
            "min-h-0 space-y-2.5 overflow-y-auto overscroll-contain px-5 text-sm",
            commentsOpen
              ? "max-h-[min(28dvh,12rem)] border-t border-foreground/10 py-2.5"
              : "hidden sm:block sm:max-h-[min(28dvh,12rem)] sm:border-t sm:border-foreground/10 sm:py-2.5",
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
            {t("comments")}
            <span className="ml-1 tabular-nums normal-case tracking-normal">
              ({comments.length})
            </span>
          </p>
          {comments.map((comment) => {
            const isAuthor = comment.authorId === data.viewerId;
            const canEdit = isAuthor && !comment.deletedAt;
            const showMenu = canEdit || canModerate;

            return (
              <div key={comment.id} className="flex gap-2.5">
                <Face
                  name={comment.authorName}
                  photoUrl={comment.authorPhotoUrl}
                  className="size-7"
                />
                <div className="min-w-0 flex-1">
                  {editingId === comment.id ? (
                    <form
                      className="flex flex-col gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!editBody.trim()) {
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
                          disabled={
                            !editBody.trim() || updateMutation.isPending
                          }
                        >
                          {tCommon("actions.save")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
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
                    <div className="space-y-0.5">
                      <p
                        className={cn(
                          "text-sm font-medium leading-snug",
                          comment.deletedAt && "text-muted-foreground",
                        )}
                      >
                        {comment.authorName}
                      </p>
                      <p
                        className={cn(
                          "whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground",
                          comment.deletedAt && "italic",
                        )}
                      >
                        <CommentBody
                          body={comment.body}
                          mentions={comment.mentions}
                        />
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        {formatDistanceToNow(comment.createdAt, {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                      </p>
                    </div>
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
        className="shrink-0 border-t border-foreground/10 px-5 py-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          submitComment();
        }}
      >
        <div className="flex items-end gap-2">
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
            className="h-9 shrink-0"
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
};
