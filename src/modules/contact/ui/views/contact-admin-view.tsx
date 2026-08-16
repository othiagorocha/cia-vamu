"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/trpc/client";

export const ContactAdminView = () => {
  const t = useTranslations("contactAdmin");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const [messages] = trpc.contact.listAll.useSuspenseQuery();
  const [openId, setOpenId] = useState<string | null>(null);

  const invalidate = () => {
    utils.contact.listAll.invalidate();
    utils.contact.unreadCount.invalidate();
  };

  const markMutation = trpc.contact.markAsRead.useMutation({
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });

  const removeMutation = trpc.contact.remove.useMutation({
    onSuccess: () => {
      toast.success(t("deleted"));
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (messages.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          {t("empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow
                key={message.id}
                tabIndex={0}
                className="cursor-pointer"
                onClick={() =>
                  setOpenId((current) =>
                    current === message.id ? null : message.id,
                  )
                }
              >
                <TableCell className="font-medium">{message.name}</TableCell>
                <TableCell>{message.email}</TableCell>
                <TableCell>
                  {format(new Date(message.createdAt), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant={message.readAt ? "secondary" : "default"}>
                    {message.readAt ? t("read") : t("unread")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {messages
        .filter((message) => message.id === openId)
        .map((message) => (
          <div key={message.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <p className="whitespace-pre-wrap text-sm">{message.message}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  markMutation.mutate({
                    id: message.id,
                    read: !message.readAt,
                  })
                }
              >
                {message.readAt ? t("markUnread") : t("markRead")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => removeMutation.mutate({ id: message.id })}
              >
                {tCommon("actions.delete")}
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
};

export const ContactAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
};
