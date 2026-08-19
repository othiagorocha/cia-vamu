import type { AuditAction, AuditEntityType } from "@/modules/audit/actions";

export type AuditChangeValue = string | boolean | null;

export type AuditChange = {
  field: string;
  from: AuditChangeValue;
  to: AuditChangeValue;
};

export type AuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | AuditChange[];

export type AuditMetadata = Record<string, AuditMetadataValue>;

export type AuditActor = {
  id: string;
  name: string;
  email: string;
};

export type AuditLogRecord = {
  id: string;
  actorUserId: string | null;
  actorName: string;
  actorEmail: string;
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId: string;
  metadata: AuditMetadata;
  createdAt: Date;
};

export type AuditLogListResult = {
  items: AuditLogRecord[];
  total: number;
};

export const isAuditChange = (value: unknown): value is AuditChange => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuditChange>;
  return typeof candidate.field === "string";
};

export const getAuditChanges = (metadata: AuditMetadata): AuditChange[] => {
  const value = metadata.changes;
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAuditChange);
};
