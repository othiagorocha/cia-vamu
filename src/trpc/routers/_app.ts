import { albumsRouter } from "@/modules/albums/server/procedures";
import { contactRouter } from "@/modules/contact/server/procedures";
import { eventsRouter } from "@/modules/events/server/procedures";
import { staffRouter } from "@/modules/staff/server/procedures";
import { socialRouter } from "@/modules/social/server/procedures";
import { membersRouter } from "@/modules/members/server/procedures";
import { prayersRouter } from "@/modules/prayers/server/procedures";
import { createTRPCRouter } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  albums: albumsRouter,
  contact: contactRouter,
  events: eventsRouter,
  staff: staffRouter,
  social: socialRouter,
  members: membersRouter,
  prayers: prayersRouter,
});

export type AppRouter = typeof appRouter;
