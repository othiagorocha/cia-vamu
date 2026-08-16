export async function uploadFileToSignedUrl(signedUrl: string, file: File) {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: anonKey
      ? {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        }
      : undefined,
    body,
  });

  if (!response.ok) {
    throw new Error("Falha ao enviar imagem.");
  }
}
