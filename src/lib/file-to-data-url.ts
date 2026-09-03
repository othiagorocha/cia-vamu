import { prepareImageFile } from "@/lib/prepare-image-file";

export async function fileToDataUrl(file: File): Promise<string> {
  const prepared = await prepareImageFile(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(prepared);
  });
}
