import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_SRC = {
  black: "/brand/logo-cia-vamu-black.svg",
  white: "/brand/logo-cia-vamu-white.svg",
  filled: "/brand/logo-cia-vamu-filled.svg",
} as const;

type LogoVariant = keyof typeof LOGO_SRC;

type LogoProps = {
  variant?: LogoVariant;
  className?: string;
  priority?: boolean;
};

export const Logo = ({
  variant = "black",
  className,
  priority = false,
}: LogoProps) => {
  return (
    <Image
      src={LOGO_SRC[variant]}
      alt="CIA VAMU"
      width={436}
      height={436}
      priority={priority}
      className={cn("size-9 shrink-0 object-contain", className)}
    />
  );
};
