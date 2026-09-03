import { heicTo, isHeic } from "heic-to";

import { looksLikeHeic, normalizeImageContentType } from "@/lib/image-file";

export type ImagePrepareErrorCode = "imageType" | "heicConvert";

export class ImagePrepareError extends Error {
  readonly code: ImagePrepareErrorCode;

  constructor(code: ImagePrepareErrorCode) {
    super(code);
    this.name = "ImagePrepareError";
    this.code = code;
  }
}

const jpegNameFrom = (file: File) => {
  const withoutHeic = file.name.replace(/\.(heic|heif)$/i, "");
  const base = withoutHeic.trim() || "foto";
  return base.toLowerCase().endsWith(".jpg") || base.toLowerCase().endsWith(".jpeg")
    ? base
    : `${base}.jpg`;
};

export async function prepareImageFile(file: File): Promise<File> {
  if (normalizeImageContentType(file.type)) {
    return file;
  }

  const heic = looksLikeHeic(file) || (await isHeic(file));
  if (!heic) {
    throw new ImagePrepareError("imageType");
  }

  try {
    const jpeg = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: 0.9,
    });

    return new File([jpeg], jpegNameFrom(file), { type: "image/jpeg" });
  } catch {
    throw new ImagePrepareError("heicConvert");
  }
}
