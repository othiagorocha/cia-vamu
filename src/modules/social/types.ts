import type { socialLinks } from "@/db/schema";

export type SocialLinkRecord = typeof socialLinks.$inferSelect;
