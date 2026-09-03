const STORAGE_KEY = "cia-vamu.photo-clipboard";
const CHANGE_EVENT = "cia-vamu-photo-clipboard";

export type PhotoClipboardMode = "copy" | "cut";

export type PhotoClipboardPayload = {
  mode: PhotoClipboardMode;
  sourceAlbumId: string;
  photoIds: string[];
};

const isPayload = (value: unknown): value is PhotoClipboardPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as PhotoClipboardPayload;
  return (
    (payload.mode === "copy" || payload.mode === "cut") &&
    typeof payload.sourceAlbumId === "string" &&
    Array.isArray(payload.photoIds) &&
    payload.photoIds.every((id) => typeof id === "string") &&
    payload.photoIds.length > 0
  );
};

export const readPhotoClipboard = (): PhotoClipboardPayload | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writePhotoClipboard = (payload: PhotoClipboardPayload) => {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const clearPhotoClipboard = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const subscribePhotoClipboard = (onChange: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};
