"use client";

import { FileCode2Icon, FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  buildEventsMarkdown,
  buildEventsPlainText,
  buildEventsWhatsAppText,
  copyTextToClipboard,
  whatsappShareUrl,
} from "@/modules/events/event-share";
import type { EventRecord } from "@/modules/events/types";

type EventShareMenuItemsProps = {
  events: EventRecord[];
};

export const EventShareMenuItems = ({ events }: EventShareMenuItemsProps) => {
  const t = useTranslations("events");
  const labels = {
    heading: t("shareHeading"),
    publicVisibility: t("visibility.public"),
    teamVisibility: t("visibility.team"),
    when: t("shareWhen"),
    where: t("shareWhere"),
  };

  const shareWhatsApp = () => {
    if (events.length === 0) {
      return;
    }

    window.open(
      whatsappShareUrl(buildEventsWhatsAppText(events, labels)),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const copy = async (format: "text" | "markdown") => {
    if (events.length === 0) {
      return;
    }

    const payload =
      format === "markdown"
        ? buildEventsMarkdown(events, labels)
        : buildEventsPlainText(events, labels);

    try {
      await copyTextToClipboard(payload);
      toast.success(t("shareCopied"));
    } catch {
      toast.error(t("shareCopyFailed"));
    }
  };

  return (
    <>
      <DropdownMenuItem
        className="py-2"
        disabled={events.length === 0}
        onClick={shareWhatsApp}
      >
        <FaWhatsapp />
        {t("shareWhatsApp")}
      </DropdownMenuItem>
      <DropdownMenuItem
        className="py-2"
        disabled={events.length === 0}
        onClick={() => {
          void copy("text");
        }}
      >
        <FileTextIcon />
        {t("shareText")}
      </DropdownMenuItem>
      <DropdownMenuItem
        className="py-2"
        disabled={events.length === 0}
        onClick={() => {
          void copy("markdown");
        }}
      >
        <FileCode2Icon />
        {t("shareMarkdown")}
      </DropdownMenuItem>
    </>
  );
};
