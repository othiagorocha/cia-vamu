import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuditAction, AuditEntityType } from "@/modules/audit/actions";
import type { AuditActor, AuditMetadata, AuditMetadataValue } from "@/modules/audit/types";

type WriteAuditLogInput = {
  actor: AuditActor;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, AuditMetadataValue | undefined>;
};

const compactMetadata = (
  metadata: Record<string, AuditMetadataValue | undefined> | undefined,
): AuditMetadata => {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, AuditMetadataValue] => entry[1] !== undefined,
    ),
  );
};

export const writeAuditLog = async (input: WriteAuditLogInput) => {
  try {
    await db.insert(auditLogs).values({
      actorUserId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: compactMetadata(input.metadata),
    });
  } catch (error) {
    console.error("Falha ao gravar audit log", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
  }
};
