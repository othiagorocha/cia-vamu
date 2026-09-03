import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import {
  albums,
  memberProfiles,
  photoCommentMentions,
  photoComments,
  photoLikes,
  photos,
} from "@/db/schema";
import { hasCapability } from "@/lib/permissions";
import {
  createSignedImageUpload,
  deleteImageFromStorage,
  publicUrlForStoragePath,
  uploadImageToStorage,
} from "@/lib/storage";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import { createNotifications } from "@/modules/notifications/server/create-notifications";
import {
  addPhotoSchema,
  addPhotoCommentSchema,
  createAlbumSchema,
  createPhotoUploadSchema,
  movePhotoSchema,
  removeAlbumSchema,
  removePhotoSchema,
  setCoverSchema,
  clearCoverSchema,
  updateAlbumSchema,
  updateCommentSchema,
  updatePhotoSchema,
} from "@/modules/albums/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
  requireCapability,
} from "@/trpc/init";

const REMOVED_ALBUM_TITLE = "Álbum removido";

const optionalTitle = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const loadPhotoAuditContext = async (photoId: string) => {
  const [row] = await db
    .select({
      photoTitle: photos.title,
      albumId: photos.albumId,
      albumTitle: albums.title,
    })
    .from(photos)
    .innerJoin(albums, eq(albums.id, photos.albumId))
    .where(eq(photos.id, photoId));

  return row ?? null;
};

const photoCommentAuditMetadata = async (photoId: string) => {
  const context = await loadPhotoAuditContext(photoId);

  return {
    title: optionalTitle(context?.photoTitle),
    albumTitle: context?.albumTitle,
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

const syncPhotoCommentMentions = async (commentId: string, userIds: string[]) => {
  await db
    .delete(photoCommentMentions)
    .where(eq(photoCommentMentions.commentId, commentId));

  if (userIds.length === 0) {
    return;
  }

  await db.insert(photoCommentMentions).values(
    userIds.map((mentionedUserId) => ({
      commentId,
      userId: mentionedUserId,
    })),
  );
};

const loadPhotoMentionUserIds = async (commentId: string) => {
  const rows = await db
    .select({ userId: photoCommentMentions.userId })
    .from(photoCommentMentions)
    .where(eq(photoCommentMentions.commentId, commentId));

  return rows.map((row) => row.userId);
};

const loadPhotoCommentMentions = async (commentIds: string[]) => {
  if (commentIds.length === 0) {
    return new Map<string, Array<{ userId: string; name: string }>>();
  }

  const rows = await db
    .select({
      commentId: photoCommentMentions.commentId,
      userId: user.id,
      name: user.name,
    })
    .from(photoCommentMentions)
    .innerJoin(user, eq(user.id, photoCommentMentions.userId))
    .where(inArray(photoCommentMentions.commentId, commentIds));

  const byComment = new Map<string, Array<{ userId: string; name: string }>>();

  for (const row of rows) {
    const current = byComment.get(row.commentId) ?? [];
    current.push({ userId: row.userId, name: row.name });
    byComment.set(row.commentId, current);
  }

  return byComment;
};

const notifyPhotoMentions = async ({
  recipientUserIds,
  actor,
  photoId,
  commentId,
  body,
}: {
  recipientUserIds: string[];
  actor: { id: string; name: string };
  photoId: string;
  commentId: string;
  body: string;
}) => {
  if (recipientUserIds.length === 0) {
    return;
  }

  const context = await loadPhotoAuditContext(photoId);

  if (!context) {
    return;
  }

  await createNotifications({
    type: "mention",
    recipientUserIds,
    actorUserId: actor.id,
    entityType: "photo_comment",
    entityId: commentId,
    href: `/admin/albums/${context.albumId}?photo=${photoId}`,
    metadata: {
      actorName: actor.name,
      eventTitle: context.albumTitle,
      excerpt: body.slice(0, 120),
    },
  });
};

const isAlbumPhotoPath = (albumId: string, storagePath: string) => {
  const prefix = `albums/${albumId}/`;
  if (!storagePath.startsWith(prefix)) {
    return false;
  }

  const fileName = storagePath.slice(prefix.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|webp|gif)$/i.test(
    fileName,
  );
};

const assertValidParent = async (parentId: string | null | undefined, selfId?: string) => {
  if (!parentId) {
    return;
  }

  if (selfId && parentId === selfId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Um álbum não pode ser pai de si mesmo.",
    });
  }

  const [parent] = await db.select().from(albums).where(eq(albums.id, parentId));

  if (!parent) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Álbum pai não encontrado.",
    });
  }

  if (parent.parentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Só é permitido um nível de sub-álbum.",
    });
  }
};

const photoCountByAlbum = db
  .select({
    albumId: photos.albumId,
    photoCount: sql<number>`count(*)::int`.mapWith(Number).as("photo_count"),
  })
  .from(photos)
  .groupBy(photos.albumId)
  .as("photo_count_by_album");

export const albumsRouter = createTRPCRouter({
  listPublished: baseProcedure.query(async () => {
    return db
      .select({
        id: albums.id,
        title: albums.title,
        description: albums.description,
        coverImageUrl: albums.coverImageUrl,
        parentId: albums.parentId,
        published: albums.published,
        publishedAt: albums.publishedAt,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
        photoCount: sql<number>`coalesce(${photoCountByAlbum.photoCount}, 0)`.mapWith(
          Number,
        ),
        publishedChildCount: sql<number>`(
          select count(*)::int from albums as child
          where child.parent_id = albums.id and child.published = true
        )`.mapWith(Number),
      })
      .from(albums)
      .leftJoin(photoCountByAlbum, eq(photoCountByAlbum.albumId, albums.id))
      .where(eq(albums.published, true))
      .orderBy(desc(albums.publishedAt), desc(albums.createdAt));
  }),

  getPublicById: baseProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const album = await db.query.albums.findFirst({
        where: (fields, { eq: equals, and: andFn }) =>
          andFn(equals(fields.id, input.id), equals(fields.published, true)),
        with: {
          photos: {
            orderBy: (fields, { asc: ascending }) => ascending(fields.sortOrder),
          },
          parent: {
            columns: {
              id: true,
              title: true,
              published: true,
            },
          },
          children: {
            with: {
              photos: {
                columns: { id: true },
              },
            },
          },
        },
      });

      if (!album) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Álbum não encontrado." });
      }

      const siblings = album.parentId
        ? await db
            .select({
              id: albums.id,
              title: albums.title,
            })
            .from(albums)
            .where(
              and(eq(albums.parentId, album.parentId), eq(albums.published, true)),
            )
            .orderBy(asc(albums.createdAt))
        : [];

      const siblingIndex = siblings.findIndex((item) => item.id === album.id);
      const previousAlbum =
        siblingIndex > 0 ? siblings[siblingIndex - 1] : null;
      const nextAlbum =
        siblingIndex >= 0 && siblingIndex < siblings.length - 1
          ? siblings[siblingIndex + 1]
          : null;

      const { parent, ...albumData } = album;

      return {
        ...albumData,
        parent:
          parent?.published
            ? { id: parent.id, title: parent.title }
            : null,
        previousAlbum,
        nextAlbum,
        children: album.children
          .filter((child) => child.published)
          .map((child) => ({
            id: child.id,
            title: child.title,
            description: child.description,
            coverImageUrl: child.coverImageUrl,
            parentId: child.parentId,
            published: child.published,
            publishedAt: child.publishedAt,
            createdAt: child.createdAt,
            updatedAt: child.updatedAt,
            photoCount: child.photos.length,
            publishedChildCount: 0,
          })),
      };
    }),

  listAll: protectedProcedure.query(async () => {
    return db
      .select({
        id: albums.id,
        title: albums.title,
        description: albums.description,
        coverImageUrl: albums.coverImageUrl,
        parentId: albums.parentId,
        published: albums.published,
        publishedAt: albums.publishedAt,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
        photoCount: sql<number>`coalesce(${photoCountByAlbum.photoCount}, 0)`.mapWith(
          Number,
        ),
      })
      .from(albums)
      .leftJoin(photoCountByAlbum, eq(photoCountByAlbum.albumId, albums.id))
      .orderBy(desc(albums.createdAt));
  }),

  listRoots: protectedProcedure.query(async () => {
    return db
      .select({ id: albums.id, title: albums.title })
      .from(albums)
      .where(isNull(albums.parentId))
      .orderBy(desc(albums.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const album = await db.query.albums.findFirst({
        where: (fields, { eq: equals }) => equals(fields.id, input.id),
        with: {
          photos: {
            orderBy: (fields, { asc: ascending }) => ascending(fields.sortOrder),
          },
          parent: {
            columns: {
              id: true,
              title: true,
            },
          },
          children: {
            orderBy: (fields, { desc: descending }) =>
              descending(fields.createdAt),
          },
        },
      });

      if (!album) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Álbum não encontrado." });
      }

      return album;
    }),

  create: requireCapability("albums:write")
    .input(createAlbumSchema)
    .mutation(async ({ ctx, input }) => {
      await assertValidParent(input.parentId);

      let coverImageUrl: string | undefined;

      const [album] = await db
        .insert(albums)
        .values({
          title: input.title,
          description: input.description,
          published: input.published,
          parentId: input.parentId || null,
          publishedAt: input.published ? new Date() : null,
        })
        .returning();

      if (input.coverImage) {
        const uploaded = await uploadImageToStorage({
          dataUrl: input.coverImage,
          folder: `albums/${album.id}`,
          fileName: "cover",
        });
        coverImageUrl = uploaded.imageUrl;

        await db
          .update(albums)
          .set({ coverImageUrl })
          .where(eq(albums.id, album.id));
      }

      const result = {
        ...album,
        coverImageUrl: coverImageUrl ?? album.coverImageUrl,
      };

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.ALBUMS_CREATE,
        entityType: "album",
        entityId: result.id,
        metadata: {
          title: result.title,
          published: result.published,
          parentId: result.parentId,
        },
      });

      return result;
    }),

  update: requireCapability("albums:write")
    .input(updateAlbumSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(albums)
        .where(eq(albums.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Álbum não encontrado." });
      }

      await assertValidParent(input.data.parentId, input.id);

      let coverImageUrl = existing.coverImageUrl;

      if (input.data.coverImage) {
        const uploaded = await uploadImageToStorage({
          dataUrl: input.data.coverImage,
          folder: `albums/${input.id}`,
          fileName: "cover",
        });
        coverImageUrl = uploaded.imageUrl;
      } else if (input.data.removeCover) {
        coverImageUrl = null;
      }

      const wasPublished = existing.published;
      const willBePublished = input.data.published;

      const [album] = await db
        .update(albums)
        .set({
          title: input.data.title,
          description: input.data.description,
          published: willBePublished,
          parentId: input.data.parentId || null,
          coverImageUrl,
          publishedAt:
            !wasPublished && willBePublished
              ? new Date()
              : existing.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(albums.id, input.id))
        .returning();

      if (album) {
        const changes = diffFields(
          {
            title: existing.title,
            published: existing.published,
          },
          {
            title: album.title,
            published: album.published,
          },
        );

        if (changes.length > 0) {
          await writeAuditLog({
            actor: ctx.session.user,
            action: AUDIT_ACTIONS.ALBUMS_UPDATE,
            entityType: "album",
            entityId: album.id,
            metadata: {
              title: album.title,
              changes,
            },
          });
        }

        if (existing.coverImageUrl && !album.coverImageUrl) {
          await writeAuditLog({
            actor: ctx.session.user,
            action: AUDIT_ACTIONS.ALBUMS_COVER_REMOVE,
            entityType: "album",
            entityId: album.id,
            metadata: { title: album.title },
          });
        }
      }

      return album;
    }),

  remove: requireCapability("albums:write")
    .input(removeAlbumSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: albums.id, title: albums.title })
        .from(albums)
        .where(eq(albums.id, input.id));

      await db.delete(albums).where(eq(albums.id, input.id));

      if (existing) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.ALBUMS_REMOVE,
          entityType: "album",
          entityId: existing.id,
          metadata: { title: existing.title },
        });
      }

      return { success: true };
    }),

  addPhoto: requireCapability("albums:write")
    .input(addPhotoSchema)
    .mutation(async ({ ctx, input }) => {
      const [album] = await db
        .select()
        .from(albums)
        .where(eq(albums.id, input.albumId));

      if (!album) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Álbum não encontrado." });
      }

      if (!isAlbumPhotoPath(input.albumId, input.storagePath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Caminho de arquivo inválido.",
        });
      }

      const existingPhotos = await db
        .select({ id: photos.id })
        .from(photos)
        .where(eq(photos.albumId, input.albumId));

      const [photo] = await db
        .insert(photos)
        .values({
          albumId: input.albumId,
          imageUrl: publicUrlForStoragePath(input.storagePath),
          storagePath: input.storagePath,
          title: input.title,
          caption: input.caption,
          sortOrder: existingPhotos.length,
        })
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.ALBUMS_PHOTO_ADD,
        entityType: "photo",
        entityId: photo.id,
        metadata: {
          title: optionalTitle(photo.title),
          albumTitle: album.title,
        },
      });

      return photo;
    }),

  createPhotoUpload: requireCapability("albums:write")
    .input(createPhotoUploadSchema)
    .mutation(async ({ input }) => {
      const [album] = await db
        .select({ id: albums.id })
        .from(albums)
        .where(eq(albums.id, input.albumId));

      if (!album) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Álbum não encontrado." });
      }

      return createSignedImageUpload({
        folder: `albums/${input.albumId}`,
        contentType: input.contentType,
      });
    }),

  updatePhoto: requireCapability("albums:write")
    .input(updatePhotoSchema)
    .mutation(async ({ ctx, input }) => {
      const [photo] = await db
        .select({
          id: photos.id,
          albumId: photos.albumId,
          title: photos.title,
          albumTitle: albums.title,
        })
        .from(photos)
        .innerJoin(albums, eq(albums.id, photos.albumId))
        .where(eq(photos.id, input.id));

      if (!photo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Foto não encontrada.",
        });
      }

      const [updated] = await db
        .update(photos)
        .set({
          title: input.title.trim() || null,
          caption: input.caption.trim() || null,
        })
        .where(eq(photos.id, input.id))
        .returning();

      if (updated) {
        const changes = diffFields(
          { title: photo.title },
          { title: updated.title },
        );

        if (changes.length > 0) {
          await writeAuditLog({
            actor: ctx.session.user,
            action: AUDIT_ACTIONS.ALBUMS_PHOTO_UPDATE,
            entityType: "photo",
            entityId: updated.id,
            metadata: {
              title: optionalTitle(updated.title),
              albumTitle: photo.albumTitle,
              changes,
            },
          });
        }
      }

      return updated;
    }),

  removePhoto: requireCapability("albums:write")
    .input(removePhotoSchema)
    .mutation(async ({ ctx, input }) => {
      const [photo] = await db
        .select({
          id: photos.id,
          albumId: photos.albumId,
          title: photos.title,
          storagePath: photos.storagePath,
          albumTitle: albums.title,
        })
        .from(photos)
        .innerJoin(albums, eq(albums.id, photos.albumId))
        .where(eq(photos.id, input.id));

      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Foto não encontrada." });
      }

      await db.delete(photos).where(eq(photos.id, input.id));

      if (photo.storagePath) {
        await deleteImageFromStorage(photo.storagePath).catch(() => undefined);
      }

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.ALBUMS_PHOTO_DELETE,
        entityType: "photo",
        entityId: photo.id,
        metadata: {
          title: optionalTitle(photo.title),
          albumTitle: photo.albumTitle,
        },
      });

      return { success: true };
    }),

  movePhoto: requireCapability("albums:write")
    .input(movePhotoSchema)
    .mutation(async ({ ctx, input }) => {
      const [photo] = await db
        .select()
        .from(photos)
        .where(eq(photos.id, input.id));

      if (!photo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Foto não encontrada.",
        });
      }

      if (photo.albumId === input.albumId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A foto já está neste álbum.",
        });
      }

      const albumRows = await db
        .select({ id: albums.id, title: albums.title })
        .from(albums)
        .where(inArray(albums.id, [photo.albumId, input.albumId]));

      const origin = albumRows.find((row) => row.id === photo.albumId);
      const destination = albumRows.find((row) => row.id === input.albumId);

      if (!destination) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Álbum de destino não encontrado.",
        });
      }

      const fromAlbumTitle = origin?.title ?? REMOVED_ALBUM_TITLE;
      const toAlbumTitle = destination.title;

      const destinationPhotos = await db
        .select({ id: photos.id })
        .from(photos)
        .where(eq(photos.albumId, input.albumId));

      const [moved] = await db
        .update(photos)
        .set({
          albumId: input.albumId,
          sortOrder: destinationPhotos.length,
        })
        .where(eq(photos.id, input.id))
        .returning();

      if (!moved) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Foto não encontrada.",
        });
      }

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.ALBUMS_PHOTO_MOVE,
        entityType: "photo",
        entityId: moved.id,
        metadata: {
          title: optionalTitle(moved.title),
          albumTitle: toAlbumTitle,
          fromAlbumTitle,
          toAlbumTitle,
          changes: [
            {
              field: "albumId",
              from: fromAlbumTitle,
              to: toAlbumTitle,
            },
          ],
        },
      });

      return moved;
    }),

  setCover: requireCapability("albums:write")
    .input(setCoverSchema)
    .mutation(async ({ ctx, input }) => {
      const [photo] = await db
        .select()
        .from(photos)
        .where(eq(photos.id, input.photoId));

      if (!photo || photo.albumId !== input.albumId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Foto não encontrada neste álbum.",
        });
      }

      const [album] = await db
        .update(albums)
        .set({
          coverImageUrl: photo.imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(albums.id, input.albumId))
        .returning();

      if (!album) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Álbum não encontrado.",
        });
      }

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.ALBUMS_COVER_SET,
        entityType: "album",
        entityId: album.id,
        metadata: {
          title: album.title,
          photoTitle: optionalTitle(photo.title),
          albumTitle: album.title,
        },
      });

      return album;
    }),

  clearCover: requireCapability("albums:write")
    .input(clearCoverSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(albums)
        .where(eq(albums.id, input.albumId));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Álbum não encontrado.",
        });
      }

      const [album] = await db
        .update(albums)
        .set({
          coverImageUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(albums.id, input.albumId))
        .returning();

      if (!album) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Álbum não encontrado.",
        });
      }

      if (existing.coverImageUrl) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.ALBUMS_COVER_REMOVE,
          entityType: "album",
          entityId: album.id,
          metadata: { title: album.title },
        });
      }

      return album;
    }),

  photoSocial: protectedProcedure
    .input(z.object({ photoId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const likes = await db
        .select({
          userId: photoLikes.userId,
          disabled: user.disabled,
        })
        .from(photoLikes)
        .innerJoin(user, eq(user.id, photoLikes.userId))
        .where(eq(photoLikes.photoId, input.photoId));

      const activeLikes = likes.filter((like) => !like.disabled);
      const comments = await db
        .select({
          id: photoComments.id,
          body: photoComments.body,
          createdAt: photoComments.createdAt,
          deletedAt: photoComments.deletedAt,
          authorId: photoComments.authorId,
          authorName: user.name,
          authorPhotoUrl: memberProfiles.photoUrl,
          authorDisabled: user.disabled,
        })
        .from(photoComments)
        .innerJoin(user, eq(user.id, photoComments.authorId))
        .leftJoin(memberProfiles, eq(memberProfiles.userId, user.id))
        .where(eq(photoComments.photoId, input.photoId))
        .orderBy(asc(photoComments.createdAt));

      const visibleComments = comments.filter((comment) => !comment.authorDisabled);
      const mentionsByComment = await loadPhotoCommentMentions(
        visibleComments.map((comment) => comment.id),
      );

      const likers = await db
        .select({
          userId: photoLikes.userId,
          name: user.name,
          photoUrl: memberProfiles.photoUrl,
          disabled: user.disabled,
        })
        .from(photoLikes)
        .innerJoin(user, eq(user.id, photoLikes.userId))
        .leftJoin(memberProfiles, eq(memberProfiles.userId, user.id))
        .where(eq(photoLikes.photoId, input.photoId))
        .orderBy(desc(photoLikes.createdAt));

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
    .input(z.object({ photoId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [existing] = await db
        .select()
        .from(photoLikes)
        .where(
          and(eq(photoLikes.photoId, input.photoId), eq(photoLikes.userId, userId)),
        );

      if (existing) {
        await db.delete(photoLikes).where(eq(photoLikes.id, existing.id));
        return { liked: false };
      }

      await db.insert(photoLikes).values({ photoId: input.photoId, userId });
      return { liked: true };
    }),

  addComment: protectedProcedure
    .input(addPhotoCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const mentionedUserIds = await validateMentionedUsers(input.mentionedUserIds);
      const body = input.body.trim();

      const [comment] = await db
        .insert(photoComments)
        .values({
          photoId: input.photoId,
          authorId: ctx.session.user.id,
          body,
        })
        .returning();

      await syncPhotoCommentMentions(comment.id, mentionedUserIds);
      await notifyPhotoMentions({
        recipientUserIds: mentionedUserIds,
        actor: ctx.session.user,
        photoId: input.photoId,
        commentId: comment.id,
        body,
      });

      const [photo] = await db
        .select({ albumId: photos.albumId })
        .from(photos)
        .where(eq(photos.id, input.photoId))
        .limit(1);

      if (photo) {
        const threadAuthors = await db
          .selectDistinct({ authorId: photoComments.authorId })
          .from(photoComments)
          .where(
            and(
              eq(photoComments.photoId, input.photoId),
              isNull(photoComments.deletedAt),
            ),
          );

        await createNotifications({
          type: "photo_comment",
          recipientUserIds: threadAuthors.map((row) => row.authorId),
          excludeUserIds: mentionedUserIds,
          actorUserId: ctx.session.user.id,
          entityType: "photo_comment",
          entityId: comment.id,
          href: `/admin/albums/${photo.albumId}?photo=${input.photoId}`,
          metadata: {
            actorName: ctx.session.user.name,
            excerpt: body.slice(0, 120),
            albumId: photo.albumId,
          },
        });
      }

      return comment;
    }),

  updateComment: protectedProcedure
    .input(updateCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(photoComments)
        .where(eq(photoComments.id, input.id));

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
      const previousMentionIds = await loadPhotoMentionUserIds(existing.id);
      const addedMentionIds = mentionedUserIds.filter(
        (id) => !previousMentionIds.includes(id),
      );
      const changes = diffFields({ body: existing.body }, { body });

      await syncPhotoCommentMentions(existing.id, mentionedUserIds);
      await notifyPhotoMentions({
        recipientUserIds: addedMentionIds,
        actor: ctx.session.user,
        photoId: existing.photoId,
        commentId: existing.id,
        body,
      });

      if (changes.length === 0) {
        return existing;
      }

      const [comment] = await db
        .update(photoComments)
        .set({ body })
        .where(eq(photoComments.id, input.id))
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.ALBUMS_COMMENT_UPDATE,
        entityType: "photo_comment",
        entityId: existing.id,
        metadata: {
          ...(await photoCommentAuditMetadata(existing.photoId)),
          changes,
        },
      });

      return comment;
    }),

  hideComment: requireCapability("users:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [comment] = await db
        .update(photoComments)
        .set({ deletedAt: new Date() })
        .where(eq(photoComments.id, input.id))
        .returning({ id: photoComments.id, photoId: photoComments.photoId });

      if (comment) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.ALBUMS_COMMENT_HIDE,
          entityType: "photo_comment",
          entityId: comment.id,
          metadata: await photoCommentAuditMetadata(comment.photoId),
        });
      }

      return { success: true };
    }),

  restoreComment: requireCapability("users:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [comment] = await db
        .update(photoComments)
        .set({ deletedAt: null })
        .where(eq(photoComments.id, input.id))
        .returning({ id: photoComments.id, photoId: photoComments.photoId });

      if (comment) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.ALBUMS_COMMENT_RESTORE,
          entityType: "photo_comment",
          entityId: comment.id,
          metadata: await photoCommentAuditMetadata(comment.photoId),
        });
      }

      return { success: true };
    }),

  deleteComment: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [comment] = await db
        .select({
          id: photoComments.id,
          photoId: photoComments.photoId,
          authorId: photoComments.authorId,
          body: photoComments.body,
        })
        .from(photoComments)
        .where(eq(photoComments.id, input.id));

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

      await db.delete(photoComments).where(eq(photoComments.id, input.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.ALBUMS_COMMENT_DELETE,
        entityType: "photo_comment",
        entityId: comment.id,
        metadata: {
          ...(await photoCommentAuditMetadata(comment.photoId)),
          changes: diffFields({ body: comment.body }, { body: null }),
        },
      });

      return { success: true };
    }),
});
