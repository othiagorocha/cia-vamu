"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

export const ADMIN_VIEW_MODES = ["grid", "table"] as const;

export type AdminViewMode = (typeof ADMIN_VIEW_MODES)[number];

export const adminViewModeParser = parseAsStringLiteral(ADMIN_VIEW_MODES)
  .withDefault("grid")
  .withOptions({ history: "replace" });

export const useAdminViewMode = () => {
  return useQueryState("view", adminViewModeParser);
};
