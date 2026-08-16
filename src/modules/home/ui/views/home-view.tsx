import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import {
  FeaturedAlbums,
  FeaturedAlbumsSkeleton,
} from "@/modules/home/ui/components/featured-albums";
import { Hero } from "@/modules/home/ui/components/hero";
import {
  UpcomingEvents,
  UpcomingEventsSkeleton,
} from "@/modules/home/ui/components/upcoming-events";

export const HomeView = () => {
  return (
    <div className="flex flex-col">
      <Hero />

      <ErrorBoundary fallbackTitle="Não foi possível carregar a agenda.">
        <Suspense fallback={<UpcomingEventsSkeleton />}>
          <UpcomingEvents />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallbackTitle="Não foi possível carregar os álbuns.">
        <Suspense fallback={<FeaturedAlbumsSkeleton />}>
          <FeaturedAlbums />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};
