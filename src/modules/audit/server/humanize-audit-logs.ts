import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { albums, photos } from "@/db/schema";
import {
  getAuditChanges,
  metadataText,
  type AuditChangeValue,
  type AuditLogRecord,
  type AuditMetadata,
} from "@/modules/audit/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REMOVED_ALBUM_TITLE = "Álbum removido";

const isUuid = (value: string) => UUID_PATTERN.test(value);

const collectUuid = (value: unknown, bucket: Set<string>) => {
  if (typeof value === "string" && isUuid(value)) {
    bucket.add(value);
  }
};

const resolveAlbumTitle = (
  value: AuditChangeValue,
  titles: Map<string, string>,
): AuditChangeValue => {
  if (typeof value !== "string" || !isUuid(value)) {
    return value;
  }

  return titles.get(value) ?? REMOVED_ALBUM_TITLE;
};

export const humanizeAuditLogs = async (
  items: AuditLogRecord[],
): Promise<AuditLogRecord[]> => {
  const albumIds = new Set<string>();
  const photoIds = new Set<string>();

  for (const item of items) {
    collectUuid(item.metadata.albumId, albumIds);
    collectUuid(item.metadata.photoId, photoIds);

    for (const change of getAuditChanges(item.metadata)) {
      if (change.field !== "albumId") {
        continue;
      }

      collectUuid(change.from, albumIds);
      collectUuid(change.to, albumIds);
    }
  }

  if (albumIds.size === 0 && photoIds.size === 0) {
    return items;
  }

  const albumTitles = new Map<string, string>();
  const photoTitles = new Map<string, string>();

  if (albumIds.size > 0) {
    const rows = await db
      .select({ id: albums.id, title: albums.title })
      .from(albums)
      .where(inArray(albums.id, [...albumIds]));

    for (const row of rows) {
      albumTitles.set(row.id, row.title);
    }
  }

  if (photoIds.size > 0) {
    const rows = await db
      .select({ id: photos.id, title: photos.title })
      .from(photos)
      .where(inArray(photos.id, [...photoIds]));

    for (const row of rows) {
      if (row.title) {
        photoTitles.set(row.id, row.title);
      }
    }
  }

  return items.map((item) => {
    const changes = getAuditChanges(item.metadata);
    const nextChanges = changes.map((change) => {
      if (change.field !== "albumId") {
        return change;
      }

      return {
        ...change,
        from: resolveAlbumTitle(change.from, albumTitles),
        to: resolveAlbumTitle(change.to, albumTitles),
      };
    });

    const albumChange = nextChanges.find((change) => change.field === "albumId");
    const metadata: AuditMetadata = { ...item.metadata };

    if (changes.length > 0) {
      metadata.changes = nextChanges;
    }

    const albumId = metadataText(item.metadata, "albumId");
    if (albumId && isUuid(albumId) && !metadataText(item.metadata, "albumTitle")) {
      metadata.albumTitle = albumTitles.get(albumId) ?? REMOVED_ALBUM_TITLE;
    }

    const photoId = metadataText(item.metadata, "photoId");
    if (photoId && isUuid(photoId) && !metadataText(item.metadata, "photoTitle")) {
      const photoTitle = photoTitles.get(photoId);
      if (photoTitle) {
        metadata.photoTitle = photoTitle;
      }
    }

    if (typeof albumChange?.from === "string" && !metadataText(item.metadata, "fromAlbumTitle")) {
      metadata.fromAlbumTitle = albumChange.from;
    }

    if (typeof albumChange?.to === "string" && !metadataText(item.metadata, "toAlbumTitle")) {
      metadata.toAlbumTitle = albumChange.to;
    }

    return {
      ...item,
      metadata,
    };
  });
};
