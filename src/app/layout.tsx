import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReloadOnStaleChunk } from "@/components/reload-on-stale-chunk";
import { Toaster } from "@/components/ui/sonner";
import { TRPCProvider } from "@/trpc/client";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CIA VAMU",
    template: "%s | CIA VAMU",
  },
  description:
    "CIA VAMU — ministério evangelístico missionário da Igreja Evangélica Batista de Ibitinga. Visão, Arte, Missão, Unção.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${outfit.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider messages={messages}>
          <NuqsAdapter>
            <TRPCProvider>
              {children}
              <ReloadOnStaleChunk />
              <Toaster richColors position="top-center" />
            </TRPCProvider>
          </NuqsAdapter>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
