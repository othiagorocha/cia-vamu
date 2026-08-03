import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import {
  AlbumPhotosAdminView,
  AlbumPhotosAdminViewSkeleton,
} from "@/modules/albums/ui/views/album-photos-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

type AlbumPhotosPageProps = {
  params: Promise<{ albumId: string }>;
};

const AlbumPhotosPage = async ({ params }: AlbumPhotosPageProps) => {
  const { albumId } = await params;

  void trpc.albums.getById.prefetch({ id: albumId });

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar o álbum.">
        <Suspense fallback={<AlbumPhotosAdminViewSkeleton />}>
          <AlbumPhotosAdminView albumId={albumId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AlbumPhotosPage;
