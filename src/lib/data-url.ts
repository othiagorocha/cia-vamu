const IMAGE_DATA_URL_HEADER = /^data:image\/(png|jpe?g|webp|gif);base64$/i;
const DATA_URL_HEADER = /^data:([^;]+);base64$/i;

function splitDataUrl(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return null;
  }

  return {
    header: dataUrl.slice(0, commaIndex),
    payload: dataUrl.slice(commaIndex + 1),
  };
}

export function isImageDataUrl(value: string) {
  const parts = splitDataUrl(value);
  return parts ? IMAGE_DATA_URL_HEADER.test(parts.header) : false;
}

export function parseDataUrl(dataUrl: string) {
  const parts = splitDataUrl(dataUrl);
  const match = parts?.header.match(DATA_URL_HEADER);

  if (!parts || !match) {
    throw new Error("Formato de imagem inválido.");
  }

  return { contentType: match[1], base64: parts.payload };
}
