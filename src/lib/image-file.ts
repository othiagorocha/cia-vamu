export const IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export function normalizeImageContentType(type: string): ImageContentType | null {
  const normalized =
    type === "image/jpg" || type === "image/pjpeg" ? "image/jpeg" : type;

  return IMAGE_CONTENT_TYPES.includes(normalized as ImageContentType)
    ? (normalized as ImageContentType)
    : null;
}
