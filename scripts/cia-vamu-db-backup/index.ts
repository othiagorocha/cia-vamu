import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { backupDatabase } from "./backup-database";
import { backupStorage } from "./backup-storage";
import { loadBackupConfig } from "./config";

async function main() {
  const config = loadBackupConfig();

  console.log(`Backup CIA VAMU → ${config.runDir}`);

  await mkdir(config.databaseDir, { recursive: true });
  await mkdir(config.storageDir, { recursive: true });

  console.log("Exportando banco (JSON + SQL)...");
  const database = await backupDatabase(config);
  console.log(
    `  SQL: ${database.sqlMode}${database.pgDumpError ? ` (fallback: ${database.pgDumpError})` : ""}`,
  );
  console.log("  Tabelas:", database.tableCounts);

  console.log(`Baixando Storage (bucket: ${config.storageBucket})...`);
  const storage = await backupStorage(
    config,
    database.referencedStoragePaths,
  );
  console.log(
    `  arquivos: ${storage.downloaded} ok, ${storage.failed} falha(s), ${storage.bytes} bytes`,
  );

  if (storage.missingReferencedPaths.length > 0) {
    console.warn(
      `  paths no DB ausentes no list do bucket: ${storage.missingReferencedPaths.length}`,
    );
  }

  const manifest = {
    exportedAt: config.exportedAt,
    stamp: config.stamp,
    runDir: config.runDir,
    database: {
      sqlMode: database.sqlMode,
      pgDumpError: database.pgDumpError ?? null,
      tableCounts: database.tableCounts,
      files: {
        dataJson: path.relative(config.runDir, database.jsonPath),
        dataSql: path.relative(config.runDir, database.dataSqlPath),
        schemaSql: path.relative(config.runDir, database.schemaSqlPath),
      },
      referencedStoragePaths: database.referencedStoragePaths.length,
    },
    storage: {
      bucket: storage.bucket,
      downloaded: storage.downloaded,
      failed: storage.failed,
      bytes: storage.bytes,
      missingReferencedPaths: storage.missingReferencedPaths,
      errors: storage.errors,
    },
  };

  const manifestPath = path.join(config.runDir, "manifest.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`Manifesto: ${manifestPath}`);
  console.log("Backup concluído.");
}

main().catch((error) => {
  console.error("Falha no backup:", error instanceof Error ? error.message : error);
  process.exit(1);
});
