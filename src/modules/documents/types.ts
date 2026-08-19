export type DocumentFolderRecord = {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentFileRecord = {
  id: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentBreadcrumb = {
  id: string;
  name: string;
};

export type DocumentFolderOption = {
  id: string;
  name: string;
  parentId: string | null;
};

export type DocumentFolderList = {
  folder: DocumentFolderRecord | null;
  ancestors: DocumentBreadcrumb[];
  folders: DocumentFolderRecord[];
  files: DocumentFileRecord[];
};

type DocumentPreviewBase = {
  name: string;
  mimeType: string;
};

export type DocumentPreview =
  | (DocumentPreviewBase & { kind: "pdf"; url: string })
  | (DocumentPreviewBase & { kind: "audio"; url: string })
  | (DocumentPreviewBase & {
      kind: "text";
      body: string;
      truncated: boolean;
    })
  | (DocumentPreviewBase & {
      kind: "html";
      html: string;
      truncated: boolean;
    })
  | (DocumentPreviewBase & { kind: "unavailable" });
