import type { albums, photos } from "@/db/schema";

export type AlbumRecord = typeof albums.$inferSelect;
export type PhotoRecord = typeof photos.$inferSelect;

export type AlbumWithPhotos = AlbumRecord & { photos: PhotoRecord[] };
