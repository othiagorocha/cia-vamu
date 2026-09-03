import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, ilike } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import {
  eventCommentMentions,
  eventComments,
  eventLikes,
  events,
  memberProfiles,
} from "@/db/schema";
import { hasCapability } from "@/lib/permissions";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import { createNotifications } from "@/modules/notifications/server/create-notifications";
import {
  addEventCommentSchema,
  eventCommentIdSchema,
  eventSocialQuerySchema,
  toggleEventLikeSchema,
  updateEventCommentSchema,
} from "@/modules/events/schema";
import { protectedProcedure, requireCapability } from "@/trpc/init";

const eventCommentAuditMetadata = async (eventId: string) => {
  const [event] = await db
    .select({ title: events.title })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  return {
    title: event?.title,
  };
};

const validateMentionedUsers = async (mentionedUserIds: string[]) => {
  const uniqueIds = [...new Set(mentionedUserIds)];

  if (uniqueIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.id, uniqueIds), eq(user.disabled, false)));

  if (rows.length !== uniqueIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Uma ou mais menções são inválidas.",
    });
  }

  return uniqueIds;
};

const syncCommentMentions = async (commentId: string, userIds: string[]) => {
  await db
    .delete(eventCommentMentions)
    .where(eq(eventCommentMentions.commentId, commentId));

  if (userIds.length === 0) {
    return;
  }

  await db.insert(eventCommentMentions).values(
    userIds.map((mentionedUserId) => ({
      commentId,
      userId: mentionedUserId,
    })),
  );
};

const loadMentionUserIds = async (commentId: string) => {
  const rows = await db
    .select({ userId: eventCommentMentions.userId })
    .from(eventCommentMentions)
    .where(eq(eventCommentMentions.commentId, commentId));

  return rows.map((row) => row.userId);
};

const notifyEventMentions = async ({
  recipientUserIds,
  actor,
  eventId,
  commentId,
  body,
}: {
  recipientUserIds: string[];
  actor: { id: string; name: string };
  eventId: string;
  commentId: string;
  body: string;
}) => {
  if (recipientUserIds.length === 0) {
    return;
  }

  const meta = await eventCommentAuditMetadata(eventId);

  await createNotifications({
    type: "mention",
    recipientUserIds,
    actorUserId: actor.id,
    entityType: "event_comment",
    entityId: commentId,
    href: `/admin/agenda?event=${eventId}`,
    metadata: {
      actorName: actor.name,
      eventTitle: meta.title ?? "",
      excerpt: body.slice(0, 120),
    },
  });
};

const loadCommentMentions = async (commentIds: string[]) => {
  if (commentIds.length === 0) {
    return new Map<string, Array<{ userId: string; name: string }>>();
  }

  const rows = await db
    .select({
      commentId: eventCommentMentions.commentId,
      userId: user.id,
      name: user.name,
    })
    .from(eventCommentMentions)
    .innerJoin(user, eq(user.id, eventCommentMentions.userId))
    .where(inArray(eventCommentMentions.commentId, commentIds));

  const byComment = new Map<string, Array<{ userId: string; name: string }>>();

  for (const row of rows) {
    const current = byComment.get(row.commentId) ?? [];
    current.push({ userId: row.userId, name: row.name });
    byComment.set(row.commentId, current);
  }

  return byComment;
};

export const eventSocialProcedures = {
  eventSocial: protectedProcedure
    .input(eventSocialQuerySchema)
    .query(async ({ ctx, input }) => {
      const likes = await db
        .select({
          userId: eventLikes.userId,
          disabled: user.disabled,
        })
        .from(eventLikes)
        .innerJoin(user, eq(user.id, eventLikes.userId))
        .where(eq(eventLikes.eventId, input.eventId));

      const activeLikes = likes.filter((like) => !like.disabled);

      const comments = await db
        .select({
          id: eventComments.id,
          body: eventComments.body,
          createdAt: eventComments.createdAt,
          deletedAt: eventComments.deletedAt,
          authorId: eventComments.authorId,
          authorName: user.name,
          authorPhotoUrl: memberProfiles.photoUrl,
          authorDisabled: user.disabled,
        })
        .from(eventComments)
        .innerJoin(user, eq(user.id, eventComments.authorId))
        .leftJoin(memberProfiles, eq(memberProfiles.userId, user.id))
        .where(eq(eventComments.eventId, input.eventId))
        .orderBy(asc(eventComments.createdAt));

      const visibleComments = comments.filter((comment) => !comment.authorDisabled);
      const mentionsByComment = await loadCommentMentions(
        visibleComments.map((comment) => comment.id),
      );

      const likers = await db
        .select({
          userId: eventLikes.userId,
          name: user.name,
          photoUrl: memberProfiles.photoUrl,
          disabled: user.disabled,
        })
        .from(eventLikes)
        .innerJoin(user, eq(user.id, eventLikes.userId))
        .leftJoin(memberProfiles, eq(memberProfiles.userId, user.id))
        .where(eq(eventLikes.eventId, input.eventId))
        .orderBy(desc(eventLikes.createdAt));

      const activeLikers = likers.filter((like) => !like.disabled);

      return {
        likeCount: activeLikes.length,
        liked: activeLikes.some((like) => like.userId === ctx.session.user.id),
        viewerId: ctx.session.user.id,
        likers: activeLikers.slice(0, 3).map((like) => ({
          userId: like.userId,
          name: like.name,
          photoUrl: like.photoUrl,
        })),
        comments: visibleComments.map((comment) => ({
          ...comment,
          mentions: mentionsByComment.get(comment.id) ?? [],
        })),
      };
    }),

  toggleLike: protectedProcedure
    .input(toggleEventLikeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [existing] = await db
        .select()
        .from(eventLikes)
        .where(
          and(eq(eventLikes.eventId, input.eventId), eq(eventLikes.userId, userId)),
        );

      if (existing) {
        await db.delete(eventLikes).where(eq(eventLikes.id, existing.id));
        return { liked: false };
      }

      await db.insert(eventLikes).values({ eventId: input.eventId, userId });
      return { liked: true };
    }),

  addComment: protectedProcedure
    .input(addEventCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const mentionedUserIds = await validateMentionedUsers(input.mentionedUserIds);

      const [comment] = await db
        .insert(eventComments)
        .values({
          eventId: input.eventId,
          authorId: ctx.session.user.id,
          body: input.body.trim(),
        })
        .returning();

      await syncCommentMentions(comment.id, mentionedUserIds);
      await notifyEventMentions({
        recipientUserIds: mentionedUserIds,
        actor: ctx.session.user,
        eventId: input.eventId,
        commentId: comment.id,
        body: input.body.trim(),
      });

      return comment;
    }),

  updateComment: protectedProcedure
    .input(updateEventCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(eventComments)
        .where(eq(eventComments.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comentário não encontrado.",
        });
      }

      if (existing.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para fazer isso.",
        });
      }

      if (existing.deletedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível editar um comentário oculto.",
        });
      }

      const body = input.body.trim();
      const mentionedUserIds = await validateMentionedUsers(input.mentionedUserIds);
      const previousMentionIds = await loadMentionUserIds(existing.id);
      const addedMentionIds = mentionedUserIds.filter(
        (id) => !previousMentionIds.includes(id),
      );
      const changes = diffFields({ body: existing.body }, { body });

      await syncCommentMentions(existing.id, mentionedUserIds);
      await notifyEventMentions({
        recipientUserIds: addedMentionIds,
        actor: ctx.session.user,
        eventId: existing.eventId,
        commentId: existing.id,
        body,
      });

      if (changes.length === 0) {
        return existing;
      }

      const [comment] = await db
        .update(eventComments)
        .set({ body })
        .where(eq(eventComments.id, input.id))
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_COMMENT_UPDATE,
        entityType: "event_comment",
        entityId: existing.id,
        metadata: {
          ...(await eventCommentAuditMetadata(existing.eventId)),
          changes,
        },
      });

      return comment;
    }),

  hideComment: requireCapability("users:manage")
    .input(eventCommentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const [comment] = await db
        .update(eventComments)
        .set({ deletedAt: new Date() })
        .where(eq(eventComments.id, input.id))
        .returning({ id: eventComments.id, eventId: eventComments.eventId });

      if (comment) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.EVENTS_COMMENT_HIDE,
          entityType: "event_comment",
          entityId: comment.id,
          metadata: await eventCommentAuditMetadata(comment.eventId),
        });
      }

      return { success: true };
    }),

  restoreComment: requireCapability("users:manage")
    .input(eventCommentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const [comment] = await db
        .update(eventComments)
        .set({ deletedAt: null })
        .where(eq(eventComments.id, input.id))
        .returning({ id: eventComments.id, eventId: eventComments.eventId });

      if (comment) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.EVENTS_COMMENT_RESTORE,
          entityType: "event_comment",
          entityId: comment.id,
          metadata: await eventCommentAuditMetadata(comment.eventId),
        });
      }

      return { success: true };
    }),

  deleteComment: protectedProcedure
    .input(eventCommentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const [comment] = await db
        .select({
          id: eventComments.id,
          eventId: eventComments.eventId,
          authorId: eventComments.authorId,
          body: eventComments.body,
        })
        .from(eventComments)
        .where(eq(eventComments.id, input.id));

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comentário não encontrado.",
        });
      }

      const isAuthor = comment.authorId === ctx.session.user.id;
      const isManager = hasCapability(ctx.session, "users:manage");

      if (!isAuthor && !isManager) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para fazer isso.",
        });
      }

      await db.delete(eventComments).where(eq(eventComments.id, input.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.EVENTS_COMMENT_DELETE,
        entityType: "event_comment",
        entityId: comment.id,
        metadata: {
          ...(await eventCommentAuditMetadata(comment.eventId)),
          changes: diffFields({ body: comment.body }, { body: null }),
        },
      });

      return { success: true };
    }),
};
