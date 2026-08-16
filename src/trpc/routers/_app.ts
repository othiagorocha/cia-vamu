import { albumsRouter } from "@/modules/albums/server/procedures";
import { contactRouter } from "@/modules/contact/server/procedures";
import { eventsRouter } from "@/modules/events/server/procedures";
import { staffRouter } from "@/modules/staff/server/procedures";
import { createTRPCRouter } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  albums: albumsRouter,
  contact: contactRouter,
  events: eventsRouter,
  staff: staffRouter,
});

export type AppRouter = typeof appRouter;
