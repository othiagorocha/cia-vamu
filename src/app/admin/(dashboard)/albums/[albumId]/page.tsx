import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { hasCapability } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  AlbumPhotosAdminView,
  AlbumPhotosAdminViewSkeleton,
} from "@/modules/albums/ui/views/album-photos-admin-view";
import { HydrateClient, trpc } from "@/trpc/server";

type AlbumPhotosPageProps = {
  params: Promise<{ albumId: string }>;
};

const AdminAlbumPhotosPage = async ({ params }: AlbumPhotosPageProps) => {
  const session = await getSession();
  const canWrite = hasCapability(session, "albums:write");
  const canModerate = hasCapability(session, "users:manage");
  const { albumId } = await params;

  void trpc.albums.getById.prefetch({ id: albumId });

  return (
    <HydrateClient>
      <ErrorBoundary fallbackTitle="Não foi possível carregar o álbum.">
        <Suspense fallback={<AlbumPhotosAdminViewSkeleton />}>
          <AlbumPhotosAdminView
            albumId={albumId}
            canWrite={canWrite}
            canModerate={canModerate}
          />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default AdminAlbumPhotosPage;
