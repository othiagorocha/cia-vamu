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
import { useAdminViewMode } from "@/lib/admin-view-mode";
import { useToastError } from "@/lib/use-toast-error";
import { AdminViewModeToggle } from "@/modules/dashboard/ui/components/admin-view-mode-toggle";
import { trpc } from "@/trpc/client";

export const ContactAdminView = () => {
  const t = useTranslations("contactAdmin");
  const tCommon = useTranslations("common");
  const toastError = useToastError();
  const utils = trpc.useUtils();
  const [messages] = trpc.contact.listAll.useSuspenseQuery();
  const [viewMode, setViewMode] = useAdminViewMode();
  const [openId, setOpenId] = useState<string | null>(null);

  const invalidate = () => {
    utils.contact.listAll.invalidate();
    utils.contact.unreadCount.invalidate();
  };

  const markMutation = trpc.contact.markAsRead.useMutation({
    onSuccess: invalidate,
    onError: toastError,
  });

  const removeMutation = trpc.contact.remove.useMutation({
    onSuccess: () => {
      toast.success(t("deleted"));
      invalidate();
    },
    onError: toastError,
  });

  const toggleOpen = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  const openMessage = messages.find((message) => message.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {messages.length > 0 ? (
          <AdminViewModeToggle
            value={viewMode}
            onChange={(mode) => {
              void setViewMode(mode);
            }}
          />
        ) : null}
      </div>

      {messages.length === 0 ? (
        <p className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {messages.map((message) => {
            const isOpen = message.id === openId;

            return (
              <article
                key={message.id}
                className="flex cursor-pointer flex-col gap-2 rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
                onClick={() => toggleOpen(message.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{message.name}</p>
                  <Badge variant={message.readAt ? "secondary" : "default"}>
                    {message.readAt ? t("read") : t("unread")}
                  </Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {message.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(message.createdAt), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </p>
                {isOpen ? (
                  <div
                    className="flex flex-col gap-3 pt-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
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
                        size="sm"
                        onClick={() => removeMutation.mutate({ id: message.id })}
                      >
                        {tCommon("actions.delete")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {message.message}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.email")}</TableHead>
                  <TableHead>{t("columns.date")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message) => (
                  <TableRow
                    key={message.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => toggleOpen(message.id)}
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
          {openMessage ? (
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <p className="whitespace-pre-wrap text-sm">{openMessage.message}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    markMutation.mutate({
                      id: openMessage.id,
                      read: !openMessage.readAt,
                    })
                  }
                >
                  {openMessage.readAt ? t("markUnread") : t("markRead")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => removeMutation.mutate({ id: openMessage.id })}
                >
                  {tCommon("actions.delete")}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export const ContactAdminViewSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
};
