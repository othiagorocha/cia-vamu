"use client";

import { useEffect, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  buildCommentBodyParts,
  type CommentMention,
} from "@/modules/events/ui/components/comment-body";
import { trpc } from "@/trpc/client";

type MentionComposerProps = {
  value: string;
  mentionedUsers: CommentMention[];
  onChange: (value: string, mentionedUsers: CommentMention[]) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
};

const syncMentionsWithBody = (body: string, mentionedUsers: CommentMention[]) =>
  mentionedUsers.filter((mention) => body.includes(`@${mention.name}`));

const getMentionAtCursor = (
  text: string,
  cursor: number,
  completionNames: string[] = [],
) => {
  const beforeCursor = text.slice(0, cursor);
  const atIndex = beforeCursor.lastIndexOf("@");

  if (atIndex === -1) {
    return null;
  }

  const charBefore = atIndex > 0 ? beforeCursor[atIndex - 1] : " ";
  if (!/\s/.test(charBefore)) {
    return null;
  }

  let query = beforeCursor.slice(atIndex + 1);

  if (/[\n\t]/.test(query) || /\s{2,}/.test(query)) {
    return null;
  }

  for (const name of completionNames) {
    if (!query.startsWith(name)) {
      continue;
    }

    if (query.length > name.length) {
      const nextChar = query[name.length];
      if (nextChar === " ") {
        return null;
      }
    }
  }

  if (query.endsWith(" ")) {
    const trimmed = query.trimEnd();
    if (completionNames.some((name) => name === trimmed)) {
      return null;
    }

    query = trimmed;
  }

  return { atIndex, query };
};

export const MentionComposer = ({
  value,
  mentionedUsers,
  onChange,
  placeholder,
  className,
  maxLength = 1000,
  disabled = false,
}: MentionComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const { data: suggestions = [] } = trpc.members.searchMentionable.useQuery(
    { query: mentionQuery ?? "" },
    {
      enabled: mentionQuery !== null,
      staleTime: 30_000,
    },
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [suggestions]);

  useEffect(() => {
    optionRefs.current[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, suggestions]);

  const completionNames = [
    ...new Set([
      ...mentionedUsers.map((mention) => mention.name),
      ...suggestions.map((suggestion) => suggestion.name),
    ]),
  ];

  const resolveMentionAtCursor = (text: string, cursor: number) =>
    getMentionAtCursor(text, cursor, completionNames);

  const closeMentions = () => {
    setMentionQuery(null);
    setMentionStart(null);
    setHighlightIndex(0);
  };

  const updateMentionState = (nextValue: string, cursor: number) => {
    const mention = resolveMentionAtCursor(nextValue, cursor);

    if (!mention) {
      closeMentions();
      return;
    }

    setMentionStart(mention.atIndex);
    setMentionQuery(mention.query);
  };

  const selectMention = (mention: { id: string; name: string }) => {
    if (mentionStart === null || !textareaRef.current) {
      return;
    }

    const cursor = textareaRef.current.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const token = `@${mention.name} `;
    const nextValue = `${before}${token}${after}`;
    const nextMentions = syncMentionsWithBody(nextValue, [
      ...mentionedUsers.filter((item) => item.userId !== mention.id),
      { userId: mention.id, name: mention.name },
    ]);

    onChange(nextValue, nextMentions);
    closeMentions();

    requestAnimationFrame(() => {
      const nextCursor = before.length + token.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const openMentionPicker = () => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) {
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const mention = resolveMentionAtCursor(value, cursor);

    if (!mention) {
      return;
    }

    setMentionStart(mention.atIndex);
    setMentionQuery(mention.query);
    setHighlightIndex(0);
  };

  const syncHighlightScroll = () => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) {
      return;
    }

    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  };

  return (
    <div className={cn("relative", className)}>
      <div className="grid *:col-start-1 *:row-start-1">
        <div
          ref={highlightRef}
          aria-hidden
          className="pointer-events-none min-h-10 overflow-hidden wrap-break-word rounded-lg border border-transparent px-2.5 py-2 text-sm whitespace-pre-wrap"
        >
          {value ? (
            buildCommentBodyParts(value, mentionedUsers)
          ) : (
            <span className="invisible">@</span>
          )}
        </div>
        <Textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={2}
          className={cn(
            "min-h-10 resize-none text-sm caret-foreground",
            value ? "text-transparent" : "text-inherit",
          )}
          onScroll={syncHighlightScroll}
          onChange={(event) => {
            const nextValue = event.target.value;
            const nextMentions = syncMentionsWithBody(nextValue, mentionedUsers);
            onChange(nextValue, nextMentions);
            updateMentionState(nextValue, event.target.selectionStart ?? nextValue.length);
          }}
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === " ") {
              event.preventDefault();
              openMentionPicker();
              return;
            }

            if (mentionQuery === null || suggestions.length === 0) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightIndex((index) => (index + 1) % suggestions.length);
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightIndex(
                (index) => (index - 1 + suggestions.length) % suggestions.length,
              );
              return;
            }

            if (
              (event.key === "Enter" && !event.shiftKey) ||
              event.key === "Tab"
            ) {
              event.preventDefault();
              const selected = suggestions[highlightIndex];
              if (selected) {
                selectMention(selected);
              }
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              closeMentions();
            }
          }}
          onBlur={() => {
            window.setTimeout(closeMentions, 120);
          }}
        />
      </div>

      {mentionQuery !== null && suggestions.length > 0 ? (
        <div
          role="listbox"
          className="absolute bottom-full left-0 z-50 mb-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-md ring-1 ring-foreground/10"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={index === highlightIndex}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
                index === highlightIndex
                  ? "bg-orange-400/15 font-medium text-foreground ring-2 ring-orange-400"
                  : "hover:bg-muted/60",
              )}
              onMouseEnter={() => setHighlightIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                selectMention(suggestion);
              }}
            >
              {suggestion.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={suggestion.photoUrl}
                  alt=""
                  className="size-6 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {suggestion.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <span className="truncate">{suggestion.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
