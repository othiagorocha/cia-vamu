import path from "node:path";

const DEFAULT_BACKUP_ROOT =
  "C:\\Users\\thiag\\Documents\\backup\\cia-vamu-database-backup";

export const TABLE_ORDER = [
  "user",
  "account",
  "session",
  "verification",
  "albums",
  "photos",
  "events",
  "member_profiles",
  "photo_likes",
  "photo_comments",
  "prayer_requests",
  "prayer_reactions",
  "contact_messages",
  "social_links",
  "invites",
  "invite_uses",
  "document_folders",
  "documents",
] as const;

export type BackupTableName = (typeof TABLE_ORDER)[number];

export type BackupConfig = {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  storageBucket: string;
  backupRoot: string;
  runDir: string;
  databaseDir: string;
  storageDir: string;
  exportedAt: string;
  stamp: string;
};

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
};

const formatStamp = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
};

export const loadBackupConfig = (): BackupConfig => {
  const exportedAt = new Date().toISOString();
  const stamp = formatStamp(new Date());
  const backupRoot = process.env.BACKUP_DIR?.trim() || DEFAULT_BACKUP_ROOT;
  const runDir = path.join(backupRoot, stamp);

  return {
    databaseUrl: requireEnv("DATABASE_URL"),
    supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "albums",
    backupRoot,
    runDir,
    databaseDir: path.join(runDir, "database"),
    storageDir: path.join(runDir, "storage"),
    exportedAt,
    stamp,
  };
};
