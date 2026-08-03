import type { contactMessages } from "@/db/schema";

export type ContactMessageRecord = typeof contactMessages.$inferSelect;
