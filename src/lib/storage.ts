import "server-only";

import { randomUUID } from "crypto";

import { parseDataUrl } from "@/lib/data-url";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

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
