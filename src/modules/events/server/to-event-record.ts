import type { EventRecord, EventTypeRecord } from "@/modules/events/types";

type EventWithTypeRow = Omit<EventRecord, "type"> & {
  type: EventTypeRecord | null;
};

export const toEventRecord = (event: EventWithTypeRow): EventRecord => {
  if (!event.type) {
    throw new Error(`Evento ${event.id} sem tipo de agenda.`);
  }

  return { ...event, type: event.type };
};
