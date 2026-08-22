"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PlaceTextMatch } from "@/modules/events/server/places-autocomplete";
import { trpc } from "@/trpc/client";

export const PLACES_SUGGEST_ATTR = "data-places-suggest";

type LocationSuggestInputProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

const HighlightedText = ({
  text,
  matches,
}: {
  text: string;
  matches: PlaceTextMatch[];
}) => {
  if (matches.length === 0) {
    return text;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.startOffset > cursor) {
      parts.push(
        <span key={`plain-${cursor}`}>
          {text.slice(cursor, match.startOffset)}
        </span>,
      );
    }

    parts.push(
      <span key={`match-${match.startOffset}`} className="font-semibold text-foreground">
        {text.slice(match.startOffset, match.endOffset)}
      </span>,
    );
    cursor = match.endOffset;
  }

  if (cursor < text.length) {
    parts.push(<span key={`plain-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return parts;
};

export const isPlacesSuggestEvent = (event: {
  target: EventTarget | null;
  detail?: { originalEvent?: Event };
}) => {
  const candidates = [event.target, event.detail?.originalEvent?.target];

  return candidates.some(
    (target) =>
      target instanceof Element &&
      Boolean(target.closest(`[${PLACES_SUGGEST_ATTR}]`)),
  );
};

export const LocationSuggestInput = ({
  id,
  name,
  value,
  onChange,
  onBlur,
}: LocationSuggestInputProps) => {
  const t = useTranslations("events");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [placesAvailable, setPlacesAvailable] = useState(true);
  const debouncedQuery = useDebouncedValue(value.trim(), 300);
  const canQuery = debouncedQuery.length >= 2 && placesAvailable;

  const suggestQuery = trpc.events.suggestLocations.useQuery(
    { query: debouncedQuery },
    {
      enabled: canQuery && open,
      retry: false,
      staleTime: 30_000,
    },
  );

  useEffect(() => {
    if (suggestQuery.data?.available === false || suggestQuery.isError) {
      setPlacesAvailable(false);
    }
  }, [suggestQuery.data?.available, suggestQuery.isError]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const suggestions = suggestQuery.data?.suggestions ?? [];
  const showMenu =
    open &&
    placesAvailable &&
    debouncedQuery.length >= 2 &&
    (suggestQuery.isFetching || suggestQuery.isSuccess);

  useEffect(() => {
    if (!showMenu) return;

    const updateMenuRect = () => {
      const el = inputRef.current;
      if (!el) return;
      setMenuRect(el.getBoundingClientRect());
    };

    updateMenuRect();
    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);

    return () => {
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
    };
  }, [showMenu, suggestions.length]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const selectSuggestion = (text: string) => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    onChange(text);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMenu || suggestions.length === 0) {
      if (event.key === "Escape") {
        setOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex].text);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const menuWidth = menuRect ? Math.max(menuRect.width, 280) : 280;

  return (
    <>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showMenu}
        aria-controls={showMenu ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimeoutRef.current !== null) {
            window.clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
          }
          setOpen(true);
        }}
        onBlur={() => {
          blurTimeoutRef.current = window.setTimeout(() => {
            setOpen(false);
            onBlur?.();
          }, 120);
        }}
        onKeyDown={handleKeyDown}
      />
      {showMenu && menuRect
        ? createPortal(
            <div
              data-places-suggest=""
              className="pointer-events-auto fixed z-[100] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
              style={{
                top: menuRect.bottom + 6,
                left: menuRect.left,
                width: menuWidth,
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <ul
                id={listId}
                role="listbox"
                className="max-h-64 overflow-y-auto py-1"
              >
                {suggestQuery.isFetching && suggestions.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm text-muted-foreground">
                    {t("form.locationSearching")}
                  </li>
                ) : suggestions.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm text-muted-foreground">
                    {t("form.locationNoResults")}
                  </li>
                ) : (
                  suggestions.map((suggestion, index) => {
                    const selected = index === activeIndex;

                    return (
                      <li
                        key={`${suggestion.text}-${index}`}
                        id={`${listId}-option-${index}`}
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 px-3 py-2",
                          selected
                            ? "bg-orange-400/15"
                            : "hover:bg-muted/70",
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          selectSuggestion(suggestion.text);
                        }}
                      >
                        <MapPinIcon
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            selected ? "text-orange-400" : "text-muted-foreground",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">
                            <HighlightedText
                              text={suggestion.mainText}
                              matches={suggestion.mainTextMatches}
                            />
                          </span>
                          {suggestion.secondaryText ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground/80">
                              {suggestion.secondaryText}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
              {suggestions.length > 0 ? (
                <p className="border-t border-border/70 px-3 py-1.5 text-[10px] tracking-wide text-muted-foreground/70">
                  {t("form.locationAttribution")}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
