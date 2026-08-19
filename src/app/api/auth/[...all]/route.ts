import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

/**
 * Envelope temporário: registra Content-Type / tamanho do body antes do Better Auth.
 * Ajuda a detectar body vazio ou Content-Type estranho atrás do hcdn da Hostinger.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type");
  let bodyPreview: {
    parseOk: boolean;
    keys?: string[];
    emailJson?: string;
    error?: string;
  } = { parseOk: false };

  const clone = request.clone();

  try {
    const json = (await clone.json()) as Record<string, unknown>;
    bodyPreview = {
      parseOk: true,
      keys: Object.keys(json),
      emailJson: JSON.stringify(json.email),
    };
  } catch (error) {
    bodyPreview = {
      parseOk: false,
      error: error instanceof Error ? error.message : "json parse failed",
    };
  }

  console.info("[auth:route] POST", {
    url: request.url,
    contentType,
    bodyPreview,
  });

  return handlers.POST(request);
}
