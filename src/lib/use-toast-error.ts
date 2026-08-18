"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  clientErrorMessage,
  type ClientErrorLike,
} from "@/lib/client-error";

export const useToastError = () => {
  const t = useTranslations("common.errors");

  return (error: ClientErrorLike) => {
    toast.error(clientErrorMessage(error, t));
  };
};
