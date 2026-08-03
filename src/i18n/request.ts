import { getRequestConfig } from "next-intl/server";

export const locale = "pt-BR" as const;

export default getRequestConfig(async () => {
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
