import type { albums, photos } from "@/db/schema";

export type AlbumRecord = typeof albums.$inferSelect;
export type PhotoRecord = typeof photos.$inferSelect;
export type AdminAlbumCard = AlbumRecord & {
  photoCount: number;
};
export type PublishedAlbumCard = AlbumRecord & {
  photoCount: number;
  publishedChildCount: number;
};

export type AlbumWithPhotos = AlbumRecord & {
  photos: PhotoRecord[];
  children: AlbumRecord[];
};
