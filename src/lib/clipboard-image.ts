import { fileToDataUrl } from "@/lib/file-to-data-url";

export class ClipboardImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipboardImageError";
  }
}

export function imageFileFromClipboardItems(items: DataTransferItemList) {
  for (const item of items) {
    if (!item.type.startsWith("image/")) continue;
    return item.getAsFile();
  }
  return null;
}

export async function readImageFileFromClipboard() {
  if (!navigator.clipboard?.read) {
    throw new ClipboardImageError(
      "Use Ctrl+V (ou Cmd+V) para colar a imagem.",
    );
  }

  try {
    const clipboardItems = await navigator.clipboard.read();

    for (const item of clipboardItems) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      return new File([blob], "clipboard-image", { type: imageType });
    }
  } catch {
    throw new ClipboardImageError(
      "Não foi possível ler a área de transferência. Tente Ctrl+V.",
    );
  }

  throw new ClipboardImageError(
    "Nenhuma imagem encontrada na área de transferência.",
  );
}

export async function clipboardImageToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new ClipboardImageError("O conteúdo colado não é uma imagem.");
  }

  return fileToDataUrl(file);
}
