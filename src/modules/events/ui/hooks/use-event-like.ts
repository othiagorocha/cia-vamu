"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useToastError } from "@/lib/use-toast-error";
import { trpc } from "@/trpc/client";

export const useEventLike = (eventId: string) => {
  const [popping, setPopping] = useState(false);
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();

  const likeMutation = trpc.events.toggleLike.useMutation({
    onMutate: async () => {
      await utils.events.eventSocial.cancel({ eventId });
      const previous = utils.events.eventSocial.getData({ eventId });
      const me = session?.user;

      utils.events.eventSocial.setData({ eventId }, (current) => {
        if (!current || !me) {
          return current;
        }

        const nextLiked = !current.liked;
        const nextLikeCount = Math.max(
          0,
          current.likeCount + (nextLiked ? 1 : -1),
        );
        const nextLikers = nextLiked
          ? current.likers.some((liker) => liker.userId === me.id)
            ? current.likers
            : [
                { userId: me.id, name: me.name, photoUrl: null },
                ...current.likers,
              ].slice(0, 3)
          : current.likers.filter((liker) => liker.userId !== me.id);

        return {
          ...current,
          liked: nextLiked,
          likeCount: nextLikeCount,
          likers: nextLikers,
        };
      });

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        utils.events.eventSocial.setData({ eventId }, context.previous);
      }

      toastError(error);
    },
    onSettled: () => {
      void utils.events.eventSocial.invalidate({ eventId });
    },
  });

  const toggle = () => {
    const current = utils.events.eventSocial.getData({ eventId });

    if (!current?.liked) {
      setPopping(true);
      window.setTimeout(() => setPopping(false), 520);
    }

    likeMutation.mutate({ eventId });
  };

  return {
    toggle,
    popping,
    isPending: likeMutation.isPending,
  };
};
