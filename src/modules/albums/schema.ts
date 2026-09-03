import { z } from "zod";

import { isImageDataUrl } from "@/lib/data-url";
import { IMAGE_CONTENT_TYPES } from "@/lib/image-file";

const dataUrlSchema = z
  .string()
  .refine(isImageDataUrl, "Imagem inválida.");

export const albumFormSchema = z.object({
  title: z.string().min(2, "Informe um título."),
  description: z.string().optional(),
  published: z.boolean(),
  parentId: z.uuid().optional().or(z.literal("")),
  coverImage: dataUrlSchema.optional(),
  removeCover: z.boolean().optional(),
  hideCover: z.boolean().optional(),
});

export type AlbumFormInput = z.infer<typeof albumFormSchema>;

export const createAlbumSchema = albumFormSchema;

export const updateAlbumSchema = z.object({
  id: z.uuid(),
  data: albumFormSchema,
});

export const removeAlbumSchema = z.object({
  id: z.uuid(),
});

export const createPhotoUploadSchema = z.object({
  albumId: z.uuid(),
  contentType: z.enum(IMAGE_CONTENT_TYPES),
});

export const addPhotoSchema = z.object({
  albumId: z.uuid(),
  storagePath: z.string().min(1).max(500),
  title: z.string().optional(),
  caption: z.string().optional(),
});

export const removePhotoSchema = z.object({
  id: z.uuid(),
});

export const photoIdsSchema = z.array(z.uuid()).min(1).max(50);

export const removePhotosSchema = z.object({
  albumId: z.uuid(),
  ids: photoIdsSchema,
});

export const movePhotoSchema = z.object({
  id: z.uuid(),
  albumId: z.uuid(),
});

export const movePhotosSchema = z.object({
  albumId: z.uuid(),
  ids: photoIdsSchema,
});

export const copyPhotosSchema = z.object({
  albumId: z.uuid(),
  ids: photoIdsSchema,
});

export const setCoverSchema = z.object({
  albumId: z.uuid(),
  photoId: z.uuid(),
});

export const clearCoverSchema = z.object({
  albumId: z.uuid(),
  hideCover: z.boolean().default(false),
});

export const updatePhotoSchema = z.object({
  id: z.uuid(),
  title: z.string().max(200),
  caption: z.string().max(2000),
});

export const addPhotoCommentSchema = z.object({
  photoId: z.uuid(),
  body: z.string().min(1).max(1000),
  mentionedUserIds: z.array(z.string().min(1)).default([]),
});

export const updateCommentSchema = z.object({
  id: z.uuid(),
  body: z.string().min(1).max(1000),
  mentionedUserIds: z.array(z.string().min(1)).default([]),
});
