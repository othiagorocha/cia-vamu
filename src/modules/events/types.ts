import type { events } from "@/db/schema";

export type EventRecord = typeof events.$inferSelect;
export type EventType = EventRecord["type"];
