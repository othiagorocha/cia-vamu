import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { BackupConfig } from "./config";

export type StorageBackupResult = {
  bucket: string;
  downloaded: number;
  failed: number;
  bytes: number;
  missingReferencedPaths: string[];
  errors: Array<{ path: string; message: string }>;
};

type ListedFile = {
  fullPath: string;
  size?: number;
};

const listAllFiles = async (
  client: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<ListedFile[]> => {
  const files: ListedFile[] = [];
  const limit = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(
        `Falha ao listar storage (${prefix || "/"}): ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      if (!item.name || item.name.startsWith(".")) {
        continue;
      }

      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      // No Storage API, pastas vêm sem `id`; arquivos têm UUID.
      if (!item.id) {
        const nested = await listAllFiles(client, bucket, fullPath);
        files.push(...nested);
        continue;
      }

      files.push({
        fullPath,
        size:
          typeof item.metadata?.size === "number"
            ? item.metadata.size
            : undefined,
      });
    }

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  return files;
};

export const backupStorage = async (
  config: BackupConfig,
  referencedStoragePaths: string[],
): Promise<StorageBackupResult> => {
  await mkdir(config.storageDir, { recursive: true });

  const client = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    { auth: { persistSession: false } },
  );

  const listed = await listAllFiles(client, config.storageBucket);
  const listedSet = new Set(listed.map((item) => item.fullPath));

  const missingReferencedPaths = referencedStoragePaths.filter(
    (storagePath) => !listedSet.has(storagePath),
  );

  // Também tenta baixar paths referenciados no DB que o list não achou.
  const toDownload = new Map<string, ListedFile>();

  for (const file of listed) {
    toDownload.set(file.fullPath, file);
  }

  for (const storagePath of missingReferencedPaths) {
    toDownload.set(storagePath, { fullPath: storagePath });
  }

  let downloaded = 0;
  let failed = 0;
  let bytes = 0;
  const errors: StorageBackupResult["errors"] = [];

  for (const file of toDownload.values()) {
    const { data, error } = await client.storage
      .from(config.storageBucket)
      .download(file.fullPath);

    if (error || !data) {
      failed += 1;
      errors.push({
        path: file.fullPath,
        message: error?.message ?? "download vazio",
      });
      continue;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const targetPath = path.join(
      config.storageDir,
      ...file.fullPath.split("/"),
    );

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, buffer);

    downloaded += 1;
    bytes += buffer.byteLength;
  }

  await writeFile(
    path.join(config.storageDir, "_index.json"),
    `${JSON.stringify(
      {
        bucket: config.storageBucket,
        listed: listed.length,
        downloaded,
        failed,
        bytes,
        missingReferencedPaths,
        errors,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    bucket: config.storageBucket,
    downloaded,
    failed,
    bytes,
    missingReferencedPaths,
    errors,
  };
};
