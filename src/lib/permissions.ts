export const SITE_CAPABILITIES = [
  "events:write",
  "albums:write",
  "users:manage",
] as const;

export type SiteCapability = (typeof SITE_CAPABILITIES)[number];

export const ALL_CAPABILITIES: SiteCapability[] = [...SITE_CAPABILITIES];

type SessionLike = {
  user: {
    capabilities?: unknown;
  };
} | null | undefined;

export const parseCapabilities = (value: unknown): SiteCapability[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is SiteCapability =>
    SITE_CAPABILITIES.includes(item as SiteCapability),
  );
};

export const getCapabilities = (session: SessionLike): SiteCapability[] => {
  return parseCapabilities(session?.user.capabilities);
};

export const hasCapability = (
  session: SessionLike,
  capability: SiteCapability,
): boolean => {
  return getCapabilities(session).includes(capability);
};
