"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { PiHandsPrayingBold } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useToastError } from "@/lib/use-toast-error";
import type { PrayerReactor } from "@/modules/prayers/types";
import { trpc } from "@/trpc/client";

type PrayerReactButtonProps = {
  requestId: string;
  reacted: boolean;
  reactors: PrayerReactor[];
};

const isolate = (event: { stopPropagation: () => void }) => {
  event.stopPropagation();
};

export const PrayerReactButton = ({
  requestId,
  reacted,
  reactors,
}: PrayerReactButtonProps) => {
  const t = useTranslations("prayers");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const [popping, setPopping] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const namesHint =
    reactors.length > 0
      ? reactors.map((reactor) => reactor.name).join(", ")
      : t("reactorsEmpty");

  const toggleMutation = trpc.prayers.toggleReaction.useMutation({
    onMutate: async () => {
      await utils.prayers.list.cancel();
      const previous = utils.prayers.list.getData();
      const me = session?.user;

      utils.prayers.list.setData(undefined, (current) =>
        current?.map((request) => {
          if (request.id !== requestId) {
            return request;
          }

          const nextReacted = !request.reacted;
          const nextReactors = nextReacted
            ? me && !request.reactors.some((reactor) => reactor.userId === me.id)
              ? [{ userId: me.id, name: me.name }, ...request.reactors]
              : request.reactors
            : request.reactors.filter((reactor) => reactor.userId !== me?.id);

          return {
            ...request,
            reacted: nextReacted,
            reactors: nextReactors,
            reactionCount: nextReactors.length,
          };
        }),
      );

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        utils.prayers.list.setData(undefined, context.previous);
      }

      toastError(error);
    },
    onSettled: () => {
      utils.prayers.list.invalidate();
    },
  });

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    isolate(event);
    event.preventDefault();

    if (!reacted) {
      setPopping(true);
      window.setTimeout(() => setPopping(false), 520);
    }

    toggleMutation.mutate({ id: requestId });
  };

  const handleOpenList = (event: MouseEvent<HTMLDivElement>) => {
    isolate(event);
    event.preventDefault();

    if (reactors.length === 0) {
      return;
    }

    setListOpen(true);
  };

  const handleCircleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    isolate(event);

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (reactors.length > 0) {
        setListOpen(true);
      }
    }
  };

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "inline-flex h-7 min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-full px-1.5 ring-1 transition-colors",
                reacted
                  ? "bg-orange-400/15 text-orange-400 ring-orange-400/40"
                  : "bg-muted/60 text-muted-foreground ring-foreground/10 hover:text-foreground",
              )}
              aria-label={t("viewReactors")}
              onClick={handleOpenList}
              onPointerDown={isolate}
              onMouseDown={isolate}
              onKeyDown={handleCircleKeyDown}
            >
              <button
                type="button"
                className="relative inline-flex size-4 items-center justify-center rounded-full"
                aria-pressed={reacted}
                aria-label={reacted ? t("prayed") : t("pray")}
                onClick={handleToggle}
                onPointerDown={isolate}
                onMouseDown={isolate}
                onKeyDown={isolate}
              >
                <PiHandsPrayingBold
                  className={cn("size-3.5", popping && "prayer-react-pop")}
                />
                {popping ? (
                  <>
                    <span className="prayer-react-spark prayer-react-spark-1" />
                    <span className="prayer-react-spark prayer-react-spark-2" />
                    <span className="prayer-react-spark prayer-react-spark-3" />
                    <span className="prayer-react-spark prayer-react-spark-4" />
                    <span className="prayer-react-spark prayer-react-spark-5" />
                  </>
                ) : null}
              </button>
              {reactors.length > 0 ? (
                <span className="pr-0.5 tabular-nums text-[11px] leading-none">
                  {reactors.length}
                </span>
              ) : null}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-56 text-left font-normal">
            {namesHint}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog
        open={listOpen}
        onOpenChange={(open) => {
          setListOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-sm"
          onClick={isolate}
          onPointerDown={isolate}
          onMouseDown={isolate}
        >
          <DialogHeader>
            <DialogTitle>{t("reactorsTitle")}</DialogTitle>
            <DialogDescription>
              {t("prayCount", { count: reactors.length })}
            </DialogDescription>
          </DialogHeader>

          {reactors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reactorsEmpty")}</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {reactors.map((reactor) => (
                <li
                  key={reactor.userId}
                  className="rounded-lg border px-3 py-2 text-sm font-medium"
                >
                  {reactor.name}
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setListOpen(false)}>
              {tCommon("actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
