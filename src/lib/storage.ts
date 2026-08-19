import "server-only";

import { randomUUID } from "crypto";

import { parseDataUrl } from "@/lib/data-url";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import {
  DOCUMENT_MIME_EXTENSION,
  DOCUMENT_MIME_TYPES,
  STORAGE_ALLOWED_DOCUMENT_MIME_TYPES,
  type DocumentMimeType,
} from "@/modules/documents/schema";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "albums";

type UploadImageInput = {
  /** Data URL no formato `data:<mime>;base64,<conteúdo>`. */
  dataUrl: string;
  /** Pasta dentro do bucket, ex.: `albums/{albumId}`. */
  folder: string;
  fileName?: string;
};

function bufferFromDataUrl(dataUrl: string) {
  const { contentType, base64 } = parseDataUrl(dataUrl);
  return { contentType, buffer: Buffer.from(base64, "base64") };
}

function extensionFromContentType(contentType: string) {
  const [, subtype] = contentType.split("/");
  return subtype?.split("+")[0] ?? "bin";
}

export async function uploadImageToStorage({
  dataUrl,
  folder,
  fileName,
}: UploadImageInput) {
  const { contentType, buffer } = bufferFromDataUrl(dataUrl);
  const extension = extensionFromContentType(contentType);
  const finalName = fileName
    ? fileName
    : `${randomUUID()}.${extension}`;
  const path = `${folder}/${finalName}`;

  const client = createSupabaseServiceRoleClient();

  const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Falha ao enviar imagem: ${error.message}`);
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);

  return { imageUrl: data.publicUrl, storagePath: path };
}

export async function createSignedImageUpload({
  folder,
  contentType,
}: {
  folder: string;
  contentType: string;
}) {
  const extension = extensionFromContentType(contentType);
  const path = `${folder}/${randomUUID()}.${extension}`;
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    throw new Error(
      `Falha ao preparar envio: ${error?.message ?? "resposta vazia."}`,
    );
  }

  return {
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export function publicUrlForStoragePath(storagePath: string) {
  const client = createSupabaseServiceRoleClient();
  const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deleteImageFromStorage(storagePath: string) {
  const client = createSupabaseServiceRoleClient();
  const { error } = await client.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    throw new Error(`Falha ao remover imagem: ${error.message}`);
  }
}

const DOCUMENTS_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET ?? "documents";
const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

const DOCUMENT_EXTENSIONS = [
  ...new Set([
    ...Object.values(DOCUMENT_MIME_EXTENSION),
    "mp2",
    "mpga",
    "mpa",
    "mpeg",
    "mpg",
  ]),
];

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  ...STORAGE_ALLOWED_DOCUMENT_MIME_TYPES,
];

export const isAllowedDocumentMimeType = (contentType: string) =>
  (DOCUMENT_MIME_TYPES as readonly string[]).includes(contentType);

const extensionFromDocument = (contentType: string, fileName?: string) => {
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && DOCUMENT_EXTENSIONS.includes(fromName)) {
    return fromName;
  }

  return DOCUMENT_MIME_EXTENSION[contentType as DocumentMimeType] ?? "bin";
};

let documentsBucketReady = false;

export async function ensureDocumentsBucket() {
  if (documentsBucketReady) {
    return;
  }

  const client = createSupabaseServiceRoleClient();
  const { data: buckets, error: listError } = await client.storage.listBuckets();

  if (listError) {
    throw new Error(`Falha ao listar buckets: ${listError.message}`);
  }

  const exists = buckets?.some((bucket) => bucket.name === DOCUMENTS_BUCKET);

  if (!exists) {
    const { error } = await client.storage.createBucket(DOCUMENTS_BUCKET, {
      public: false,
      fileSizeLimit: DOCUMENT_MAX_BYTES,
      allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
    });

    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(`Falha ao criar bucket de documentos: ${error.message}`);
    }
  }

  const { error: updateError } = await client.storage.updateBucket(
    DOCUMENTS_BUCKET,
    {
      public: false,
      fileSizeLimit: DOCUMENT_MAX_BYTES,
      allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
    },
  );

  if (updateError) {
    throw new Error(
      `Falha ao atualizar bucket de documentos: ${updateError.message}`,
    );
  }

  documentsBucketReady = true;
}

export async function createSignedDocumentUpload({
  folder,
  contentType,
  fileName,
}: {
  folder: string;
  contentType: string;
  fileName?: string;
}) {
  if (!isAllowedDocumentMimeType(contentType)) {
    throw new Error("Tipo de arquivo não permitido.");
  }

  await ensureDocumentsBucket();

  const extension = extensionFromDocument(contentType, fileName);
  const path = `${folder}/${randomUUID()}.${extension}`;
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    throw new Error(
      `Falha ao preparar envio: ${error?.message ?? "resposta vazia."}`,
    );
  }

  return {
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export async function downloadDocumentFromStorage(storagePath: string) {
  await ensureDocumentsBucket();
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `Falha ao ler arquivo: ${error?.message ?? "resposta vazia."}`,
    );
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function createSignedDocumentUrl(
  storagePath: string,
  {
    downloadName,
    expiresIn = 60 * 5,
  }: {
    downloadName?: string;
    expiresIn?: number;
  } = {},
) {
  await ensureDocumentsBucket();
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(
      storagePath,
      expiresIn,
      downloadName ? { download: downloadName } : undefined,
    );

  if (error || !data) {
    throw new Error(
      `Falha ao gerar link: ${error?.message ?? "resposta vazia."}`,
    );
  }

  return data.signedUrl;
}

export async function deleteDocumentFromStorage(storagePath: string) {
  const client = createSupabaseServiceRoleClient();
  const { error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Falha ao remover arquivo: ${error.message}`);
  }
}

export async function deleteDocumentsFromStorage(storagePaths: string[]) {
  if (storagePaths.length === 0) {
    return;
  }

  const client = createSupabaseServiceRoleClient();
  const { error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .remove(storagePaths);

  if (error) {
    throw new Error(`Falha ao remover arquivos: ${error.message}`);
  }
}

export const DOCUMENT_MAX_SIZE_BYTES = DOCUMENT_MAX_BYTES;
