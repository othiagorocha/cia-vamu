import { z } from "zod";

const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, "Imagem inválida.");

export const albumFormSchema = z.object({
  title: z.string().min(2, "Informe um título."),
  description: z.string().optional(),
  published: z.boolean(),
  coverImage: dataUrlSchema.optional(),
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

export const addPhotoSchema = z.object({
  albumId: z.uuid(),
  image: dataUrlSchema,
  caption: z.string().optional(),
});

export const removePhotoSchema = z.object({
  id: z.uuid(),
});
