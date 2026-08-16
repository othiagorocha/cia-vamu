"use client";

import { useEffect, useRef, useState } from "react";
import { MoveIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { PhotoExpandDialog } from "@/components/photo-expand-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bitmapFromSrc,
  coverScaleFor,
  type PhotoFrame,
} from "@/lib/crop-photo";
import { cn } from "@/lib/utils";

type ProfilePhotoEditorProps = {
  source: string | null;
  savedUrl: string | null;
  frame: PhotoFrame;
  onFrameChange: (frame: PhotoFrame) => void;
  onFile: (dataUrl: string) => void;
  onRemove?: () => void;
  align?: "start" | "center";
};

export const ProfilePhotoEditor = ({
  source,
  savedUrl,
  frame,
  onFrameChange,
  onFile,
  onRemove,
  align = "start",
}: ProfilePhotoEditorProps) => {
  const t = useTranslations("staff.profile");
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ lastX: number; lastY: number } | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [expanded, setExpanded] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const displaySrc = source ?? savedUrl;
  const canMove = Boolean(displaySrc);

  useEffect(() => {
    if (!displaySrc) {
      return;
    }

    let cancelled = false;

    void bitmapFromSrc(displaySrc)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }

        setNatural({ width: bitmap.width, height: bitmap.height });
        bitmap.close();
      })
      .catch(() => {
        if (!cancelled) {
          setNatural({ width: 0, height: 0 });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displaySrc]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || !canMove || !repositioning) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      onFrameChange({
        ...frame,
        zoom: Math.min(
          4,
          Math.max(1, frame.zoom + (event.deltaY > 0 ? -0.08 : 0.08)),
        ),
      });
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [canMove, frame, onFrameChange, repositioning]);

  const viewportSize = 160;
  const scale =
    natural.width && natural.height
      ? coverScaleFor(natural.width, natural.height, viewportSize) *
        Math.max(1, frame.zoom)
      : 1;

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center",
      )}
    >
      {displaySrc ? (
        <div
          ref={viewportRef}
          role={repositioning ? undefined : "button"}
          tabIndex={repositioning ? undefined : 0}
          className={
            repositioning
              ? "relative size-40 shrink-0 cursor-grab overflow-hidden rounded-full bg-muted touch-none active:cursor-grabbing"
              : "relative size-40 shrink-0 cursor-zoom-in overflow-hidden rounded-full bg-muted"
          }
          style={{ width: viewportSize, height: viewportSize }}
          onClick={() => {
            if (!repositioning) {
              setExpanded(true);
            }
          }}
          onKeyDown={(event) => {
            if (repositioning) {
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setExpanded(true);
            }
          }}
          onPointerDown={(event) => {
            if (!repositioning) {
              return;
            }

            event.currentTarget.setPointerCapture(event.pointerId);
            pointer.current = { lastX: event.clientX, lastY: event.clientY };
          }}
          onPointerMove={(event) => {
            if (!repositioning || !pointer.current) {
              return;
            }

            const dx = event.clientX - pointer.current.lastX;
            const dy = event.clientY - pointer.current.lastY;
            pointer.current = { lastX: event.clientX, lastY: event.clientY };
            onFrameChange({
              ...frame,
              offsetX: frame.offsetX + dx,
              offsetY: frame.offsetY + dy,
            });
          }}
          onPointerUp={() => {
            pointer.current = null;
          }}
          onPointerCancel={() => {
            pointer.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt=""
            draggable={false}
            className="pointer-events-none max-w-none select-none"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: natural.width ? natural.width * scale : "100%",
              height: natural.height ? natural.height * scale : "100%",
              transform: `translate(calc(-50% + ${frame.offsetX}px), calc(-50% + ${frame.offsetY}px))`,
            }}
          />
        </div>
      ) : (
        <div
          className="size-40 shrink-0 rounded-full border border-dashed bg-muted"
          style={{ width: viewportSize, height: viewportSize }}
        />
      )}
      {canMove ? (
        <div
          className={cn(
            "flex flex-col gap-2",
            align === "center" ? "items-center" : "items-start",
          )}
        >
          <div
            className={cn(
              "flex flex-wrap gap-2",
              align === "center" && "justify-center",
            )}
          >
            <Button
              type="button"
              size="sm"
              variant={repositioning ? "default" : "outline"}
              aria-pressed={repositioning}
              onClick={() => setRepositioning((current) => !current)}
            >
              <MoveIcon />
              {t("photoReposition")}
            </Button>
            {onRemove ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRemove}
              >
                <Trash2Icon />
                {t("photoRemove")}
              </Button>
            ) : null}
          </div>
          <p
            className={cn(
              "text-xs text-muted-foreground",
              align === "center" && "text-center",
            )}
          >
            {repositioning ? t("photoRepositionHint") : t("photoHint")}
          </p>
        </div>
      ) : null}
      <Input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              onFile(reader.result);
            }
          };
          reader.readAsDataURL(file);
        }}
      />
      <PhotoExpandDialog
        src={expanded ? displaySrc : null}
        alt={t("photo")}
        onClose={() => setExpanded(false)}
      />
    </div>
  );
};

export const PROFILE_PHOTO_VIEWPORT = 160;
