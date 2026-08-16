import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { albums, photos } from "@/db/schema";
import { deleteImageFromStorage, uploadImageToStorage } from "@/lib/storage";
import {
  addPhotoSchema,
  createAlbumSchema,
  removeAlbumSchema,
  removePhotoSchema,
  updateAlbumSchema,
} from "@/modules/albums/schema";
import { baseProcedure, createTRPCRouter, requireCapability } from "@/trpc/init";

export const albumsRouter = createTRPCRouter({
  listPublished: baseProcedure.query(async () => {
    return db
      .select()
      .from(albums)
      .where(eq(albums.published, true))
      .orderBy(desc(albums.publishedAt), desc(albums.createdAt));
  }),

  getPublicById: baseProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const album = await db.query.albums.findFirst({
        where: (fields, { eq: equals, and }) =>
          and(equals(fields.id, input.id), equals(fields.published, true)),
        with: {
          photos: {
            orderBy: (fields, { asc: ascending }) => ascending(fields.sortOrder),
          },
        },
      });

      if (!album) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Álbum não encontrado." });
      }

      return album;
    }),

  listAll: requireCapability("albums:write").query(async () => {
    return db.select().from(albums).orderBy(desc(albums.createdAt));
  }),

  getById: requireCapability("albums:write")
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const album = await db.query.albums.findFirst({
        where: (fields, { eq: equals }) => equals(fields.id, input.id),
        with: {
          photos: {
            orderBy: (fields, { asc: ascending }) => ascending(fields.sortOrder),
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
      let coverImageUrl: string | undefined;

      const [album] = await db
        .insert(albums)
        .values({
          title: input.title,
          description: input.description,
          published: input.published,
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

      const existingPhotos = await db
        .select({ id: photos.id })
        .from(photos)
        .where(eq(photos.albumId, input.albumId));

      const uploaded = await uploadImageToStorage({
        dataUrl: input.image,
        folder: `albums/${input.albumId}`,
      });

      const [photo] = await db
        .insert(photos)
        .values({
          albumId: input.albumId,
          imageUrl: uploaded.imageUrl,
          storagePath: uploaded.storagePath,
          caption: input.caption,
          sortOrder: existingPhotos.length,
        })
        .returning();

      return photo;
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
        await deleteImageFromStorage(photo.storagePath).catch(() => {
          // best-effort: se falhar, o registro já foi removido do banco.
        });
      }

      return { success: true };
    }),
});

