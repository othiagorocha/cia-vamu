import { z } from "zod";

import { AUDIT_MODULES } from "@/modules/audit/actions";

export const AUDIT_PAGE_SIZE = 50;

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listAuditLogsSchema = z.object({
  actorUserId: z.string().min(1).optional(),
  module: z.enum(AUDIT_MODULES).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(AUDIT_PAGE_SIZE),
});

export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>;
