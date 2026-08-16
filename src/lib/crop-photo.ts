import { parseDataUrl } from "@/lib/data-url";

export type PhotoFrame = {
  offsetX: number;
  offsetY: number;
  zoom: number;
};

const OUTPUT_SIZE = 512;

const dataUrlToBlob = (dataUrl: string) => {
  const { contentType, base64 } = parseDataUrl(dataUrl);
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);

  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }

  return new Blob([buffer], { type: contentType });
};

export const bitmapFromSrc = async (src: string) => {
  const blob = src.startsWith("data:")
    ? dataUrlToBlob(src)
    : await (await fetch(src)).blob();

  return createImageBitmap(blob, { imageOrientation: "from-image" });
};

export const coverScaleFor = (width: number, height: number, viewport: number) =>
  Math.max(viewport / width, viewport / height);

export const cropPhotoToSquare = async (
  src: string,
  frame: PhotoFrame,
  viewport: number,
): Promise<string> => {
  const image = await bitmapFromSrc(src);
  const size = Math.max(1, viewport);
  const zoom = Math.max(1, frame.zoom);
  const displayScale = coverScaleFor(image.width, image.height, size) * zoom;
  const factor = OUTPUT_SIZE / size;
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    image.close();
    throw new Error("Não foi possível recortar a imagem.");
  }

  const drawWidth = image.width * displayScale * factor;
  const drawHeight = image.height * displayScale * factor;
  const dx = OUTPUT_SIZE / 2 + frame.offsetX * factor - drawWidth / 2;
  const dy = OUTPUT_SIZE / 2 + frame.offsetY * factor - drawHeight / 2;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, dx, dy, drawWidth, drawHeight);
  image.close();

  return canvas.toDataURL("image/jpeg", 0.92);
};
