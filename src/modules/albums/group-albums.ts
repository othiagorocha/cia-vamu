type AlbumWithParent = {
  id: string;
  parentId: string | null;
};

export const groupAlbumsByParent = <T extends AlbumWithParent>(albums: T[]) => {
  const ids = new Set(albums.map((album) => album.id));
  const childrenByParent = new Map<string, T[]>();
  const roots: T[] = [];

  for (const album of albums) {
    if (!album.parentId || !ids.has(album.parentId)) {
      roots.push(album);
      continue;
    }

    const siblings = childrenByParent.get(album.parentId) ?? [];
    siblings.push(album);
    childrenByParent.set(album.parentId, siblings);
  }

  return { roots, childrenByParent };
};
