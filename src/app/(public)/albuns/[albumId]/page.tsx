import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import {
  AlbumDetailView,
  AlbumDetailViewSkeleton,
} from "@/modules/albums/ui/views/album-detail-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

type AlbumPageProps = {
  params: Promise<{ albumId: string }>;
};

const AlbumPage = async ({ params }: AlbumPageProps) => {
  const { albumId } = await params;

  void trpc.albums.getPublicById.prefetch({ id: albumId });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <HydrateClient>
        <ErrorBoundary fallbackTitle="Não foi possível carregar este álbum.">
          <Suspense fallback={<AlbumDetailViewSkeleton />}>
            <AlbumDetailView albumId={albumId} />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </div>
  );
};

export default AlbumPage;
