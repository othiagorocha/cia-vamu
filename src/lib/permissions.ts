export const SITE_CAPABILITIES = [
  "events:write",
  "albums:write",
  "users:manage",
  "site:write",
  "contact:manage",
] as const;

export type SiteCapability = (typeof SITE_CAPABILITIES)[number];

export const ALL_CAPABILITIES: SiteCapability[] = [...SITE_CAPABILITIES];

export const EDITOR_CAPABILITIES = [
  "events:write",
  "albums:write",
  "site:write",
] as const;

export type EditorCapability = (typeof EDITOR_CAPABILITIES)[number];

export const SITE_ROLES = ["member", "editor", "gestor"] as const;

export type SiteRole = (typeof SITE_ROLES)[number];

type SessionLike = {
  user: {
    capabilities?: unknown;
    disabled?: unknown;
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

export const roleFromCapabilities = (capabilities: SiteCapability[]): SiteRole => {
  if (capabilities.includes("users:manage")) {
    return "gestor";
  }

  if (
    capabilities.some((capability) =>
      (EDITOR_CAPABILITIES as readonly SiteCapability[]).includes(capability),
    )
  ) {
    return "editor";
  }

  return "member";
};

export const editorModulesFromCapabilities = (
  capabilities: SiteCapability[],
): EditorCapability[] => {
  return EDITOR_CAPABILITIES.filter((capability) =>
    capabilities.includes(capability),
  );
};

export const capabilitiesFromRole = (
  role: SiteRole,
  modules: EditorCapability[] = [],
): SiteCapability[] => {
  if (role === "gestor") {
    return [...ALL_CAPABILITIES];
  }

  if (role === "editor") {
    return EDITOR_CAPABILITIES.filter((capability) => modules.includes(capability));
  }

  return [];
};
