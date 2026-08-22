"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

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
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={handleKeyDown}
      />
      {showMenu && menuRect
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              className="fixed z-[80] max-h-56 overflow-y-auto rounded-lg border bg-popover py-1 text-sm text-popover-foreground shadow-md"
              style={{
                top: menuRect.bottom + 4,
                left: menuRect.left,
                width: menuRect.width,
              }}
            >
              {suggestQuery.isFetching && suggestions.length === 0 ? (
                <li className="px-2.5 py-2 text-muted-foreground">
                  {t("form.locationSearching")}
                </li>
              ) : suggestions.length === 0 ? (
                <li className="px-2.5 py-2 text-muted-foreground">
                  {t("form.locationNoResults")}
                </li>
              ) : (
                suggestions.map((suggestion, index) => (
                  <li
                    key={`${suggestion.text}-${index}`}
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      "cursor-pointer px-2.5 py-1.5",
                      index === activeIndex && "bg-accent text-accent-foreground",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectSuggestion(suggestion.text)}
                  >
                    {suggestion.text}
                  </li>
                ))
              )}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
};
