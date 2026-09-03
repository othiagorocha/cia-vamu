import type { eventTypes, events } from "@/db/schema";

export type EventTypeRecord = typeof eventTypes.$inferSelect;

export type EventRecord = typeof events.$inferSelect & {
  type: EventTypeRecord;
};
