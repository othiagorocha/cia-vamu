import type { Metadata } from "next";
import { Suspense } from "react";

import { InviteView } from "@/modules/auth/ui/views/invite-view";

export const metadata: Metadata = {
  title: "Convite",
};

const AdminInvitePage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;

  return (
    <Suspense>
      <InviteView token={token} />
    </Suspense>
  );
};

export default AdminInvitePage;
