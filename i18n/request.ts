import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'sv'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'sv';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await import(`../messages/${locale}.json`);
  return {
    messages: messages.default
  };
});

