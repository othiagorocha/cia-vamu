"use client";

import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

export const LoginSubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2Icon className="animate-spin" /> : null}
      {label}
    </Button>
  );
};
