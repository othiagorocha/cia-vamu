import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/** Uma única leitura de sessão por request (layout + tRPC compartilham). */
export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
