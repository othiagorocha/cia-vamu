"use client";

import { useEffect, useRef } from "react";
import { Controller, useWatch, type Control, type UseFormGetValues, type UseFormSetValue } from "react-hook-form";
import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EventFormInput } from "@/modules/events/schema";
import { LocationSuggestInput } from "@/modules/events/ui/components/location-suggest-input";

type EventLocationFieldsProps = {
  control: Control<EventFormInput>;
  getValues: UseFormGetValues<EventFormInput>;
  setValue: UseFormSetValue<EventFormInput>;
  open: boolean;
  onOpen: () => void;
};

export const EventLocationFields = ({
  control,
  getValues,
  setValue,
  open,
  onOpen,
}: EventLocationFieldsProps) => {
  const t = useTranslations("events");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const shouldFocusRef = useRef(false);
  const location = useWatch({ control, name: "location" });
  const mapsQuery = useWatch({ control, name: "locationMapsQuery" });
  const summary = location?.trim() || mapsQuery?.trim();

  useEffect(() => {
    if (!open || !shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Field className="self-start">
      <FieldLabel htmlFor={open ? "location" : "location-toggle"}>
        {t("form.location")}
      </FieldLabel>

      {open ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/15 p-3">
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="location" className="text-xs text-muted-foreground">
                  {t("form.locationName")}
                </FieldLabel>
                <Input
                  {...field}
                  ref={(element) => {
                    field.ref(element);
                    nameInputRef.current = element;
                  }}
                  id="location"
                  placeholder={t("form.locationNamePlaceholder")}
                />
                <FieldDescription className="text-[11px] leading-tight text-muted-foreground/55">
                  {t("form.locationHint")}
                </FieldDescription>
              </Field>
            )}
          />

          <Controller
            control={control}
            name="locationMapsQuery"
            render={({ field }) => (
              <Field className="relative">
                <FieldLabel
                  htmlFor="locationMapsQuery"
                  className="text-xs text-muted-foreground"
                >
                  {t("form.locationMaps")}
                </FieldLabel>
                <LocationSuggestInput
                  id="locationMapsQuery"
                  name={field.name}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  onSelectSuggestion={(place) => {
                    if (!getValues("location")?.trim()) {
                      setValue("location", place.mainText, { shouldDirty: true });
                    }
                  }}
                />
                <FieldDescription className="text-[11px] leading-tight text-muted-foreground/55">
                  {t("form.locationMapsHint")}
                </FieldDescription>
              </Field>
            )}
          />
        </div>
      ) : (
        <button
          id="location-toggle"
          type="button"
          onClick={() => {
            shouldFocusRef.current = true;
            onOpen();
          }}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-lg border border-input px-2.5 text-left text-sm outline-none transition-colors",
            "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "dark:bg-input/30",
            summary ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <MapPinIcon className="size-3.5 shrink-0 text-orange-400" />
          <span className="truncate">
            {summary || t("form.locationPlaceholder")}
          </span>
        </button>
      )}
    </Field>
  );
};
