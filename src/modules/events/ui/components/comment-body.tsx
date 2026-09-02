import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CommentMention = {
  userId: string;
  name: string;
};

export const mentionHighlightClassName =
  "rounded-sm bg-orange-400/15 font-medium text-orange-400";

export const buildCommentBodyParts = (
  body: string,
  mentions: CommentMention[],
): ReactNode[] => {
  if (mentions.length === 0) {
    return [body];
  }

  const parts: ReactNode[] = [];
  let remaining = body;

  for (const mention of mentions) {
    const token = `@${mention.name}`;
    const index = remaining.indexOf(token);

    if (index === -1) {
      continue;
    }

    if (index > 0) {
      parts.push(remaining.slice(0, index));
    }

    parts.push(
      <span key={`${mention.userId}-${index}`} className={mentionHighlightClassName}>
        {token}
      </span>,
    );

    remaining = remaining.slice(index + token.length);
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts;
};

export const CommentBody = ({
  body,
  mentions,
  className,
}: {
  body: string;
  mentions: CommentMention[];
  className?: string;
}) => {
  if (mentions.length === 0) {
    return <span className={className}>{body}</span>;
  }

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {buildCommentBodyParts(body, mentions)}
    </span>
  );
};
