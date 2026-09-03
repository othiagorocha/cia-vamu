"use client";

import { createParser, useQueryState } from "nuqs";

const queryOptions = { history: "replace" as const };

export const eventsIncludePastParser = createParser({
  parse: (value) => value === "1",
  serialize: (value) => (value ? "1" : ""),
})
  .withDefault(false)
  .withOptions(queryOptions);

export const useEventsIncludePast = () =>
  useQueryState("includePast", eventsIncludePastParser);
