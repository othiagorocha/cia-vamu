import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import {
  albums,
  memberProfiles,
  photoComments,
  photoLikes,
  photos,
} from "@/db/schema";
import {
  createSignedImageUpload,
  deleteImageFromStorage,
  publicUrlForStoragePath,
  uploadImageToStorage,
} from "@/lib/storage";
import {
  addPhotoSchema,
  createAlbumSchema,
  createPhotoUploadSchema,
  movePhotoSchema,
  removeAlbumSchema,
  removePhotoSchema,
  setCoverSchema,
  updateAlbumSchema,
  updatePhotoSchema,
} from "@/modules/albums/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
  requireCapability,
} from "@/trpc/init";

const parentAlbum = alias(albums, "parent_album");

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
        photoCount: sql<number>`(
          select count(*)::int from photos where photos.album_id = ${albums.id}
        )`,
        publishedChildCount: sql<number>`(
          select count(*)::int from albums as child
          where child.parent_id = ${albums.id} and child.published = true
        )`,
      })
      .from(albums)
      .leftJoin(parentAlbum, eq(albums.parentId, parentAlbum.id))
      .where(
        and(
          eq(albums.published, true),
          or(isNull(albums.parentId), eq(parentAlbum.published, false)),
        ),
      )
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
    return db.select().from(albums).orderBy(desc(albums.createdAt));
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
    .mutation(async ({ input }) => {
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

      return { ...album, coverImageUrl: coverImageUrl ?? album.coverImageUrl };
    }),

  update: requireCapability("albums:write")
    .input(updateAlbumSchema)
    .mutation(async ({ input }) => {
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

      return album;
    }),

  remove: requireCapability("albums:write")
    .input(removeAlbumSchema)
    .mutation(async ({ input }) => {
      await db.delete(albums).where(eq(albums.id, input.id));
      return { success: true };
    }),

  addPhoto: requireCapability("albums:write")
    .input(addPhotoSchema)
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
      const [photo] = await db
        .select({ id: photos.id })
        .from(photos)
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

      return updated;
    }),

  removePhoto: requireCapability("albums:write")
    .input(removePhotoSchema)
    .mutation(async ({ input }) => {
      const [photo] = await db
        .select()
        .from(photos)
        .where(eq(photos.id, input.id));

      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Foto não encontrada." });
      }

      await db.delete(photos).where(eq(photos.id, input.id));

      if (photo.storagePath) {
        await deleteImageFromStorage(photo.storagePath).catch(() => undefined);
      }

      return { success: true };
    }),

  movePhoto: requireCapability("albums:write")
    .input(movePhotoSchema)
    .mutation(async ({ input }) => {
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

      const [destination] = await db
        .select({ id: albums.id })
        .from(albums)
        .where(eq(albums.id, input.albumId));

      if (!destination) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Álbum de destino não encontrado.",
        });
      }

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

      return moved;
    }),

  setCover: requireCapability("albums:write")
    .input(setCoverSchema)
    .mutation(async ({ input }) => {
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
        likers: activeLikers.slice(0, 3).map((like) => ({
          userId: like.userId,
          name: like.name,
          photoUrl: like.photoUrl,
        })),
        comments: visibleComments,
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
    .input(
      z.object({
        photoId: z.uuid(),
        body: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [comment] = await db
        .insert(photoComments)
        .values({
          photoId: input.photoId,
          authorId: ctx.session.user.id,
          body: input.body.trim(),
        })
        .returning();

      return comment;
    }),

  hideComment: requireCapability("users:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await db
        .update(photoComments)
        .set({ deletedAt: new Date() })
        .where(eq(photoComments.id, input.id));
      return { success: true };
    }),

  restoreComment: requireCapability("users:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await db
        .update(photoComments)
        .set({ deletedAt: null })
        .where(eq(photoComments.id, input.id));
      return { success: true };
    }),

  deleteComment: requireCapability("users:manage")
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(photoComments).where(eq(photoComments.id, input.id));
      return { success: true };
    }),
});
