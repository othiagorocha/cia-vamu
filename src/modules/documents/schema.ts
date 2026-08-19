import { z } from "zod";

export const DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "audio/flac",
] as const;

export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

export const DOCUMENT_MIME_EXTENSION: Record<DocumentMimeType, string> = {
  "application/pdf": "pdf",
  "text/markdown": "md",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/webm": "weba",
  "audio/flac": "flac",
};

const MIME_BY_EXTENSION: Record<string, DocumentMimeType> = {
  pdf: "application/pdf",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  mp3: "audio/mpeg",
  mp2: "audio/mpeg",
  mpga: "audio/mpeg",
  mpa: "audio/mpeg",
  mpeg: "audio/mpeg",
  mpg: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  flac: "audio/flac",
};

const MPEG_AUDIO_EXTENSIONS = new Set([
  "mp3",
  "mp2",
  "mpga",
  "mpa",
  "mpeg",
  "mpg",
]);

const MIME_ALIASES: Record<string, DocumentMimeType> = {
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/mpeg3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-mpeg-3": "audio/mpeg",
  "audio/mpga": "audio/mpeg",
  "audio/mpg": "audio/mpeg",
  "audio/mp2": "audio/mpeg",
  "audio/mpeg2": "audio/mpeg",
  "audio/mpa": "audio/mpeg",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/mp4": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
};

const normalizeMime = (value: string) =>
  value.split(";")[0]?.trim().toLowerCase() ?? "";

export const STORAGE_ALLOWED_DOCUMENT_MIME_TYPES = [
  ...DOCUMENT_MIME_TYPES,
  "audio/x-mp3",
  "audio/mpeg3",
  "audio/x-mpeg",
  "audio/x-mpeg-3",
  "audio/mpga",
  "audio/mpg",
  "audio/mp2",
  "audio/mpeg2",
  "audio/mpa",
  "video/mpeg",
] as const;

export const isAudioMimeType = (mimeType: string) =>
  mimeType.startsWith("audio/");

export const mimeTypeFromFile = (file: File): DocumentMimeType | null => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const normalized = normalizeMime(file.type);

  if (MPEG_AUDIO_EXTENSIONS.has(extension)) {
    return "audio/mpeg";
  }

  const fromAlias = MIME_ALIASES[normalized];
  if (fromAlias) {
    return fromAlias;
  }

  if (DOCUMENT_MIME_TYPES.includes(normalized as DocumentMimeType)) {
    return normalized as DocumentMimeType;
  }

  return MIME_BY_EXTENSION[extension] ?? null;
};

const folderIdSchema = z.uuid().nullable().optional();

export const listFolderSchema = z.object({
  folderId: folderIdSchema,
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da pasta.").max(120),
  parentId: z.uuid().nullable().optional(),
});

export type FolderNameInput = z.infer<typeof createFolderSchema>;

export const renameFolderSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Informe o nome da pasta.").max(120),
});

export const folderIdInputSchema = z.object({
  id: z.uuid(),
});

export const createDocumentUploadSchema = z.object({
  folderId: z.uuid().nullable().optional(),
  contentType: z.enum(DOCUMENT_MIME_TYPES),
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(DOCUMENT_MAX_SIZE_BYTES),
});

export const confirmDocumentUploadSchema = z.object({
  folderId: z.uuid().nullable().optional(),
  storagePath: z.string().min(1),
  name: z.string().trim().min(1).max(255),
  mimeType: z.enum(DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(DOCUMENT_MAX_SIZE_BYTES),
});

export const renameFileSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Informe o nome do arquivo.").max(255),
});

export const getDownloadUrlSchema = z.object({
  id: z.uuid(),
  download: z.boolean().optional(),
});

export const getPreviewSchema = z.object({
  id: z.uuid(),
});

export const moveFileSchema = z.object({
  id: z.uuid(),
  folderId: z.uuid().nullable(),
});

export const moveFolderSchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
});
