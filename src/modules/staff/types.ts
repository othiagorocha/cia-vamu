import type { SiteCapability } from "@/lib/permissions";

export type StaffRecord = {
  id: string;
  name: string;
  email: string;
  capabilities: SiteCapability[];
  disabled: boolean;
  isMember: boolean;
  showOnAbout: boolean;
  isSuperAdmin: boolean;
  role: string | null;
  photoUrl: string | null;
  createdAt: Date;
  lastAccessAt: Date | null;
};

export type InviteRecord = {
  id: string;
  capabilities: SiteCapability[];
  expiresAt: Date | null;
  createdAt: Date;
  maxUses: number | null;
  usedCount: number;
};

export type InviteUseRecord = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  userExists: boolean;
  disabled: boolean;
};
