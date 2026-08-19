import type { prayerRequests } from "@/db/schema";

export type PrayerReactor = {
  userId: string;
  name: string;
};

export type PrayerRequestRecord = typeof prayerRequests.$inferSelect & {
  reactionCount: number;
  reacted: boolean;
  reactors: PrayerReactor[];
};
