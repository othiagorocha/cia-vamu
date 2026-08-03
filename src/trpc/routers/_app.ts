import { createTRPCRouter } from "@/trpc/init";
import { albumsRouter } from "@/modules/albums/server/procedures";
import { contactRouter } from "@/modules/contact/server/procedures";
import { eventsRouter } from "@/modules/events/server/procedures";

export const appRouter = createTRPCRouter({
  albums: albumsRouter,
  contact: contactRouter,
  events: eventsRouter,
});

export type AppRouter = typeof appRouter;
