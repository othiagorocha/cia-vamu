import "server-only";

import { randomUUID } from "crypto";

import { createSupabaseServiceRoleClient } from "@/lib/supabase";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "albums";

type UploadImageInput = {
  /** Data URL no formato `data:<mime>;base64,<conteúdo>`. */
  dataUrl: string;
  /** Pasta dentro do bucket, ex.: `albums/{albumId}`. */
  folder: string;
  fileName?: string;
};

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);

  if (!match) {
    throw new Error("Formato de imagem inválido.");
  }

  const [, contentType, base64] = match;
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
  const { contentType, buffer } = parseDataUrl(dataUrl);
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

export async function deleteImageFromStorage(storagePath: string) {
  const client = createSupabaseServiceRoleClient();
  const { error } = await client.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    throw new Error(`Falha ao remover imagem: ${error.message}`);
  }
}
