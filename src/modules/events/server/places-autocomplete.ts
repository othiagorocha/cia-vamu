type GoogleTextMatch = {
  startOffset?: number;
  endOffset?: number;
};

type GoogleFormattableText = {
  text?: string;
  matches?: GoogleTextMatch[];
};

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: GoogleFormattableText;
      structuredFormat?: {
        mainText?: GoogleFormattableText;
        secondaryText?: GoogleFormattableText;
      };
    };
  }>;
};

export type PlaceTextMatch = {
  startOffset: number;
  endOffset: number;
};

export type PlaceSuggestion = {
  text: string;
  mainText: string;
  secondaryText?: string;
  mainTextMatches: PlaceTextMatch[];
};

export type PlaceSuggestionsResult = {
  available: boolean;
  suggestions: PlaceSuggestion[];
};

const toMatches = (matches: GoogleTextMatch[] | undefined): PlaceTextMatch[] =>
  (matches ?? [])
    .map((match) => ({
      startOffset: match.startOffset ?? 0,
      endOffset: match.endOffset ?? 0,
    }))
    .filter((match) => match.endOffset > match.startOffset);

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
          "X-Goog-FieldMask":
            "suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
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
    const suggestions: PlaceSuggestion[] = [];

    for (const item of data.suggestions ?? []) {
      const prediction = item.placePrediction;
      const text = prediction?.text?.text?.trim();
      const mainText =
        prediction?.structuredFormat?.mainText?.text?.trim() || text;
      const secondaryText =
        prediction?.structuredFormat?.secondaryText?.text?.trim();

      if (!text || !mainText) {
        continue;
      }

      suggestions.push({
        text,
        mainText,
        ...(secondaryText ? { secondaryText } : {}),
        mainTextMatches: toMatches(
          prediction?.structuredFormat?.mainText?.matches,
        ),
      });
    }

    return { available: true, suggestions };
  } catch (error) {
    console.error("Places Autocomplete indisponível.", error);
    return { available: true, suggestions: [] };
  }
}
