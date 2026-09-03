export const IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const IMAGE_FILE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.heic,.heif";

const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence"]);

export function looksLikeHeic(file: File) {
  if (HEIC_MIME_TYPES.has(file.type.toLowerCase())) {
    return true;
  }

  return /\.(heic|heif)$/i.test(file.name);
}

export function normalizeImageContentType(type: string): ImageContentType | null {
  const normalized =
    type === "image/jpg" || type === "image/pjpeg" ? "image/jpeg" : type;

  return IMAGE_CONTENT_TYPES.includes(normalized as ImageContentType)
    ? (normalized as ImageContentType)
    : null;
}
