import type { SiteCapability } from "@/lib/permissions";

export type StaffRecord = {
  id: string;
  name: string;
  email: string;
  capabilities: SiteCapability[];
  disabled: boolean;
  isMember: boolean;
  showOnAbout: boolean;
  role: string | null;
  photoUrl: string | null;
  createdAt: Date;
};

export type InviteRecord = {
  id: string;
  capabilities: SiteCapability[];
  expiresAt: Date | null;
  createdAt: Date;
  maxUses: number | null;
  usedCount: number;
};
