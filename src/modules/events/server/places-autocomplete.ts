type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      text?: {
        text?: string;
      };
    };
  }>;
};

export type PlaceSuggestion = {
  text: string;
};

export type PlaceSuggestionsResult = {
  available: boolean;
  suggestions: PlaceSuggestion[];
};

export async function fetchPlaceSuggestions(
  query: string,
): Promise<PlaceSuggestionsResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    return { available: false, suggestions: [] };
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "suggestions.placePrediction.text",
        },
        body: JSON.stringify({
          input: query,
          languageCode: "pt-BR",
          includedRegionCodes: ["br"],
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "Places Autocomplete falhou.",
        response.status,
        response.statusText,
      );
      return { available: true, suggestions: [] };
    }

    const data = (await response.json()) as GoogleAutocompleteResponse;
    const suggestions = (data.suggestions ?? [])
      .map((item) => item.placePrediction?.text?.text?.trim())
      .filter((text): text is string => Boolean(text))
      .map((text) => ({ text }));

    return { available: true, suggestions };
  } catch (error) {
    console.error("Places Autocomplete indisponível.", error);
    return { available: true, suggestions: [] };
  }
}
