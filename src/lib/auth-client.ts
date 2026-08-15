import { createAuthClient } from "better-auth/react";

/** Sem baseURL: o browser usa a origem atual (evita localhost gravado no build). */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
