import type { SiteCapability } from "@/lib/permissions";

export type StaffRecord = {
  id: string;
  name: string;
  email: string;
  capabilities: SiteCapability[];
  createdAt: Date;
};
