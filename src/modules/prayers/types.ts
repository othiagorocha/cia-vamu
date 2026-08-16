import type { prayerRequests } from "@/db/schema";

export type PrayerRequestRecord = typeof prayerRequests.$inferSelect;
