"use client";

import { useEffect } from "react";

const STORAGE_KEY = "cia-vamu:stale-chunk-reload";
const COOLDOWN_MS = 10_000;

function isStaleAsset(url: string) {
  return url.includes("/_next/static/");
}

function reloadOnce() {
  const last = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0);
  if (Date.now() - last < COOLDOWN_MS) return;
  sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  window.location.reload();
}

export const ReloadOnStaleChunk = () => {
  useEffect(() => {
    const onError = (event: Event) => {
      const el = event.target;
      if (
        (el instanceof HTMLScriptElement && isStaleAsset(el.src)) ||
        (el instanceof HTMLLinkElement && isStaleAsset(el.href))
      ) {
        reloadOnce();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = String(
        reason instanceof Error ? reason.message : (reason ?? ""),
      );
      const name = reason instanceof Error ? reason.name : undefined;
      if (name === "ChunkLoadError" || message.includes("Loading chunk")) {
        reloadOnce();
      }
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
};
