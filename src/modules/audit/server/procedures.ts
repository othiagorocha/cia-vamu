import { and, count, desc, eq, gte, like, lt, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { parseBrazilDateTime } from "@/lib/brazil-datetime";
import { listAuditLogsSchema } from "@/modules/audit/schema";
import { humanizeAuditLogs } from "@/modules/audit/server/humanize-audit-logs";
import type { AuditLogListResult, AuditLogRecord } from "@/modules/audit/types";
import { createTRPCRouter, requireCapability } from "@/trpc/init";

const DAY_MS = 24 * 60 * 60 * 1000;

const toRecord = (row: typeof auditLogs.$inferSelect): AuditLogRecord => ({
  id: row.id,
  actorUserId: row.actorUserId,
  actorName: row.actorName,
  actorEmail: row.actorEmail,
  action: row.action,
  entityType: row.entityType,
  entityId: row.entityId,
  metadata: row.metadata ?? {},
  createdAt: row.createdAt,
});

export const auditRouter = createTRPCRouter({
  list: requireCapability("users:manage")
    .input(listAuditLogsSchema)
    .query(async ({ input }): Promise<AuditLogListResult> => {
      const filters: SQL[] = [];

      if (input.actorUserId) {
        filters.push(eq(auditLogs.actorUserId, input.actorUserId));
      }

      if (input.module) {
        filters.push(like(auditLogs.action, `${input.module}.%`));
      }

      if (input.from) {
        filters.push(
          gte(auditLogs.createdAt, parseBrazilDateTime(`${input.from}T00:00`)),
        );
      }

      if (input.to) {
        const toExclusive = new Date(
          parseBrazilDateTime(`${input.to}T00:00`).getTime() + DAY_MS,
        );
        filters.push(lt(auditLogs.createdAt, toExclusive));
      }

      const where = filters.length > 0 ? and(...filters) : undefined;

      const [totalRow] = await db
        .select({ total: count() })
        .from(auditLogs)
        .where(where);

      const rows = await db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: await humanizeAuditLogs(rows.map(toRecord)),
        total: totalRow?.total ?? 0,
      };
    }),
});
