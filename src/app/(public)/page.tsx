import { HomeView } from "@/modules/home/ui/views/home-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

const HomePage = () => {
  void trpc.albums.listPublished.prefetch();
  void trpc.events.listUpcoming.prefetch({ includePast: false });

  return (
    <HydrateClient>
      <HomeView />
    </HydrateClient>
  );
};

export default HomePage;
