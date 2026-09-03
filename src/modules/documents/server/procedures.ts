import { TRPCError } from "@trpc/server";
import { asc, desc, eq, inArray, isNull } from "drizzle-orm";
import mammoth from "mammoth";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { documentFolders, documents } from "@/db/schema";

import {
  createSignedDocumentUpload,
  createSignedDocumentUrl,
  deleteDocumentFromStorage,
  deleteDocumentsFromStorage,
  downloadDocumentFromStorage,
  isAllowedDocumentMimeType,
} from "@/lib/storage";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import { createNotifications } from "@/modules/notifications/server/create-notifications";
import { renderMarkdownToHtml } from "@/modules/documents/render-markdown";
import { sanitizePreviewHtml } from "@/modules/documents/sanitize-html";
import {
  confirmDocumentUploadSchema,
  createDocumentUploadSchema,
  createFolderSchema,
  folderIdInputSchema,
  getDownloadUrlSchema,
  getPreviewSchema,
  isAudioMimeType,
  listFolderSchema,
  moveFileSchema,
  moveFolderSchema,
  renameFileSchema,
  renameFolderSchema,
} from "@/modules/documents/schema";
import type {
  DocumentBreadcrumb,
  DocumentFileRecord,
  DocumentFolderList,
  DocumentFolderOption,
  DocumentFolderRecord,
  DocumentPreview,
} from "@/modules/documents/types";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const INLINE_MIME_TYPES = new Set([
  "application/pdf",
  "text/markdown",
  "text/plain",
]);

const PREVIEW_TEXT_MAX_CHARS = 400_000;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const decodeTextPreview = (buffer: Buffer) => {
  const body = buffer.toString("utf8");
  if (body.length <= PREVIEW_TEXT_MAX_CHARS) {
    return { body, truncated: false };
  }

  return {
    body: body.slice(0, PREVIEW_TEXT_MAX_CHARS),
    truncated: true,
  };
};

const folderByParent = (parentId: string | null) =>
  parentId ? eq(documentFolders.parentId, parentId) : isNull(documentFolders.parentId);

const filesByFolder = (folderId: string | null) =>
  folderId ? eq(documents.folderId, folderId) : isNull(documents.folderId);

const toFolderRecord = (row: {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DocumentFolderRecord => ({
  id: row.id,
  name: row.name,
  parentId: row.parentId,
  createdById: row.createdById,
  createdByName: row.createdByName,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toFileRecord = (row: {
  id: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DocumentFileRecord => ({
  id: row.id,
  folderId: row.folderId,
  name: row.name,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  createdById: row.createdById,
  createdByName: row.createdByName,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const requireFolder = async (id: string) => {
  const [folder] = await db
    .select()
    .from(documentFolders)
    .where(eq(documentFolders.id, id));

  if (!folder) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Pasta não encontrada.",
    });
  }

  return folder;
};

const requireFile = async (id: string) => {
  const [file] = await db.select().from(documents).where(eq(documents.id, id));

  if (!file) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Arquivo não encontrado.",
    });
  }

  return file;
};

const getAncestors = async (folderId: string): Promise<DocumentBreadcrumb[]> => {
  const crumbs: DocumentBreadcrumb[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const [folder] = await db
      .select({
        id: documentFolders.id,
        name: documentFolders.name,
        parentId: documentFolders.parentId,
      })
      .from(documentFolders)
      .where(eq(documentFolders.id, currentId));

    if (!folder) {
      break;
    }

    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }

  return crumbs;
};

const collectFolderIds = async (rootId: string) => {
  const ids = [rootId];
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const children = await db
      .select({ id: documentFolders.id })
      .from(documentFolders)
      .where(eq(documentFolders.parentId, currentId));

    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }

  return ids;
};

const storageFolder = (folderId: string | null) =>
  `folders/${folderId ?? "root"}`;

const folderNameById = async (id: string | null) => {
  if (!id) {
    return null;
  }

  const [folder] = await db
    .select({ name: documentFolders.name })
    .from(documentFolders)
    .where(eq(documentFolders.id, id));

  return folder?.name ?? null;
};

export const documentsRouter = createTRPCRouter({
  listFolder: protectedProcedure
    .input(listFolderSchema)
    .query(async ({ input }): Promise<DocumentFolderList> => {
      const folderId = input.folderId ?? null;
      const currentFolder = folderId ? await requireFolder(folderId) : null;

      const [folderRows, fileRows] = await Promise.all([
        db
          .select({
            id: documentFolders.id,
            name: documentFolders.name,
            parentId: documentFolders.parentId,
            createdById: documentFolders.createdById,
            createdByName: user.name,
            createdAt: documentFolders.createdAt,
            updatedAt: documentFolders.updatedAt,
          })
          .from(documentFolders)
          .leftJoin(user, eq(user.id, documentFolders.createdById))
          .where(folderByParent(folderId))
          .orderBy(asc(documentFolders.name)),
        db
          .select({
            id: documents.id,
            folderId: documents.folderId,
            name: documents.name,
            mimeType: documents.mimeType,
            sizeBytes: documents.sizeBytes,
            createdById: documents.createdById,
            createdByName: user.name,
            createdAt: documents.createdAt,
            updatedAt: documents.updatedAt,
          })
          .from(documents)
          .leftJoin(user, eq(user.id, documents.createdById))
          .where(filesByFolder(folderId))
          .orderBy(desc(documents.createdAt)),
      ]);

      return {
        folder: currentFolder
          ? toFolderRecord({
              ...currentFolder,
              createdByName: null,
            })
          : null,
        ancestors: folderId ? await getAncestors(folderId) : [],
        folders: folderRows.map(toFolderRecord),
        files: fileRows.map(toFileRecord),
      };
    }),

  listFolderTree: protectedProcedure.query(
    async (): Promise<DocumentFolderOption[]> => {
      return db
        .select({
          id: documentFolders.id,
          name: documentFolders.name,
          parentId: documentFolders.parentId,
        })
        .from(documentFolders)
        .orderBy(asc(documentFolders.name));
    },
  ),

  createFolder: protectedProcedure
    .input(createFolderSchema)
    .mutation(async ({ ctx, input }) => {
      const parentId = input.parentId ?? null;

      if (parentId) {
        await requireFolder(parentId);
      }

      const [created] = await db
        .insert(documentFolders)
        .values({
          name: input.name.trim(),
          parentId,
          createdById: ctx.session.user.id,
        })
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.DOCUMENTS_CREATE_FOLDER,
        entityType: "document_folder",
        entityId: created.id,
        metadata: { name: created.name },
      });

      return created;
    }),

  renameFolder: protectedProcedure
    .input(renameFolderSchema)
    .mutation(async ({ ctx, input }) => {
      await requireFolder(input.id);

      const [updated] = await db
        .update(documentFolders)
        .set({
          name: input.name.trim(),
          updatedAt: new Date(),
        })
        .where(eq(documentFolders.id, input.id))
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.DOCUMENTS_RENAME_FOLDER,
        entityType: "document_folder",
        entityId: updated.id,
        metadata: { name: updated.name },
      });

      return updated;
    }),

  removeFolder: protectedProcedure
    .input(folderIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const folder = await requireFolder(input.id);
      const folderIds = await collectFolderIds(input.id);
      const files = await db
        .select({ storagePath: documents.storagePath })
        .from(documents)
        .where(inArray(documents.folderId, folderIds));

      await deleteDocumentsFromStorage(files.map((file) => file.storagePath));
      await db.delete(documentFolders).where(eq(documentFolders.id, input.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.DOCUMENTS_REMOVE_FOLDER,
        entityType: "document_folder",
        entityId: folder.id,
        metadata: { name: folder.name },
      });

      return { success: true };
    }),

  moveFile: protectedProcedure
    .input(moveFileSchema)
    .mutation(async ({ ctx, input }) => {
      const file = await requireFile(input.id);
      const folderId = input.folderId;

      if (folderId) {
        await requireFolder(folderId);
      }

      if (file.folderId === folderId) {
        return file;
      }

      const [fromName, toName] = await Promise.all([
        folderNameById(file.folderId),
        folderNameById(folderId),
      ]);

      const [updated] = await db
        .update(documents)
        .set({
          folderId,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.id))
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.DOCUMENTS_MOVE_FILE,
        entityType: "document",
        entityId: updated.id,
        metadata: {
          name: updated.name,
          fromFolderId: file.folderId,
          toFolderId: folderId,
          fromFolderName: fromName,
          toFolderName: toName,
        },
      });

      return updated;
    }),

  moveFolder: protectedProcedure
    .input(moveFolderSchema)
    .mutation(async ({ ctx, input }) => {
      const folder = await requireFolder(input.id);
      const parentId = input.parentId;

      if (parentId === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível mover uma pasta para dentro de si mesma.",
        });
      }

      if (parentId) {
        await requireFolder(parentId);
        const descendantIds = await collectFolderIds(input.id);
        if (descendantIds.includes(parentId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível mover uma pasta para dentro de si mesma.",
          });
        }
      }

      if (folder.parentId === parentId) {
        return folder;
      }

      const [fromName, toName] = await Promise.all([
        folderNameById(folder.parentId),
        folderNameById(parentId),
      ]);

      const [updated] = await db
        .update(documentFolders)
        .set({
          parentId,
          updatedAt: new Date(),
        })
        .where(eq(documentFolders.id, input.id))
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.DOCUMENTS_MOVE_FOLDER,
        entityType: "document_folder",
        entityId: updated.id,
        metadata: {
          name: updated.name,
          fromFolderId: folder.parentId,
          toFolderId: parentId,
          fromFolderName: fromName,
          toFolderName: toName,
        },
      });

      return updated;
    }),

  createUpload: protectedProcedure
    .input(createDocumentUploadSchema)
    .mutation(async ({ input }) => {
      const folderId = input.folderId ?? null;

      if (folderId) {
        await requireFolder(folderId);
      }

      if (!isAllowedDocumentMimeType(input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tipo de arquivo não permitido.",
        });
      }

      return createSignedDocumentUpload({
        folder: storageFolder(folderId),
        contentType: input.contentType,
        fileName: input.fileName,
      });
    }),

  confirmUpload: protectedProcedure
    .input(confirmDocumentUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const folderId = input.folderId ?? null;
      const expectedPrefix = `${storageFolder(folderId)}/`;

      if (!input.storagePath.startsWith(expectedPrefix)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Caminho de arquivo inválido.",
        });
      }

      if (folderId) {
        await requireFolder(folderId);
      }

      const [created] = await db
        .insert(documents)
        .values({
          folderId,
          name: input.name.trim(),
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storagePath: input.storagePath,
          createdById: ctx.session.user.id,
        })
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.DOCUMENTS_UPLOAD,
        entityType: "document",
        entityId: created.id,
        metadata: { name: created.name },
      });

      await createNotifications({
        type: "document_uploaded",
        actorUserId: ctx.session.user.id,
        entityType: "document",
        entityId: created.id,
        href: "/admin/documentos",
        metadata: {
          actorName: ctx.session.user.name,
          documentName: created.name,
        },
      });

      return created;
    }),

  renameFile: protectedProcedure
    .input(renameFileSchema)
    .mutation(async ({ ctx, input }) => {
      await requireFile(input.id);

      const [updated] = await db
        .update(documents)
        .set({
          name: input.name.trim(),
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.id))
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.DOCUMENTS_RENAME_FILE,
        entityType: "document",
        entityId: updated.id,
        metadata: { name: updated.name },
      });

      return updated;
    }),

  removeFile: protectedProcedure
    .input(folderIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const file = await requireFile(input.id);
      await deleteDocumentFromStorage(file.storagePath);
      await db.delete(documents).where(eq(documents.id, input.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.DOCUMENTS_REMOVE_FILE,
        entityType: "document",
        entityId: file.id,
        metadata: { name: file.name },
      });

      return { success: true };
    }),

  getDownloadUrl: protectedProcedure
    .input(getDownloadUrlSchema)
    .mutation(async ({ input }) => {
      const file = await requireFile(input.id);
      const forceDownload =
        input.download === true ||
        !(
          INLINE_MIME_TYPES.has(file.mimeType) || isAudioMimeType(file.mimeType)
        );

      const url = await createSignedDocumentUrl(file.storagePath, {
        downloadName: forceDownload ? file.name : undefined,
      });

      return { url, name: file.name, mimeType: file.mimeType };
    }),

  getPreview: protectedProcedure
    .input(getPreviewSchema)
    .query(async ({ input }): Promise<DocumentPreview> => {
      const file = await requireFile(input.id);
      const base = { name: file.name, mimeType: file.mimeType };

      if (file.mimeType === "application/pdf" || isAudioMimeType(file.mimeType)) {
        const url = await createSignedDocumentUrl(file.storagePath, {
          expiresIn: 60 * 30,
        });
        return {
          ...base,
          kind: isAudioMimeType(file.mimeType) ? "audio" : "pdf",
          url,
        };
      }

      if (file.mimeType === "application/msword") {
        return { ...base, kind: "unavailable" };
      }

      const buffer = await downloadDocumentFromStorage(file.storagePath);

      if (file.mimeType === "text/plain") {
        const text = decodeTextPreview(buffer);
        return { ...base, kind: "text", ...text };
      }

      if (file.mimeType === "text/markdown") {
        const text = decodeTextPreview(buffer);
        return {
          ...base,
          kind: "html",
          html: renderMarkdownToHtml(text.body),
          truncated: text.truncated,
        };
      }

      if (file.mimeType === DOCX_MIME) {
        try {
          const result = await mammoth.convertToHtml({ buffer });
          return {
            ...base,
            kind: "html",
            html: sanitizePreviewHtml(result.value),
            truncated: false,
          };
        } catch {
          return { ...base, kind: "unavailable" };
        }
      }

      return { ...base, kind: "unavailable" };
    }),
});
