import type { AuditChange, AuditChangeValue } from "@/modules/audit/types";

const normalize = (value: AuditChangeValue | undefined): AuditChangeValue => {
  if (value === undefined || value === "") {
    return null;
  }

  return value;
};

export const diffFields = (
  before: Record<string, AuditChangeValue | undefined>,
  after: Record<string, AuditChangeValue | undefined>,
): AuditChange[] => {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: AuditChange[] = [];

  for (const field of fields) {
    const from = normalize(before[field]);
    const to = normalize(after[field]);

    if (from !== to) {
      changes.push({ field, from, to });
    }
  }

  return changes;
};
