export async function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);

    if (anonKey) {
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("Authorization", `Bearer ${anonKey}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error("Falha ao enviar o arquivo."));
    };

    xhr.onerror = () => {
      reject(new Error("Falha ao enviar o arquivo."));
    };

    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}
