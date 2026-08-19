import type { DocumentFolderOption } from "@/modules/documents/types";

export type DocumentFolderTreeNode = DocumentFolderOption & {
  children: DocumentFolderTreeNode[];
};

export const buildFolderTree = (
  folders: DocumentFolderOption[],
): DocumentFolderTreeNode[] => {
  const childrenByParent = new Map<string | null, DocumentFolderOption[]>();

  for (const folder of folders) {
    const siblings = childrenByParent.get(folder.parentId) ?? [];
    siblings.push(folder);
    childrenByParent.set(folder.parentId, siblings);
  }

  const build = (parentId: string | null): DocumentFolderTreeNode[] =>
    (childrenByParent.get(parentId) ?? []).map((folder) => ({
      ...folder,
      children: build(folder.id),
    }));

  return build(null);
};

export const collectDescendantIds = (
  folders: DocumentFolderOption[],
  rootId: string,
) => {
  const ids = new Set<string>([rootId]);
  const childrenByParent = new Map<string | null, DocumentFolderOption[]>();

  for (const folder of folders) {
    const siblings = childrenByParent.get(folder.parentId) ?? [];
    siblings.push(folder);
    childrenByParent.set(folder.parentId, siblings);
  }

  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    for (const child of childrenByParent.get(currentId) ?? []) {
      ids.add(child.id);
      queue.push(child.id);
    }
  }

  return ids;
};
