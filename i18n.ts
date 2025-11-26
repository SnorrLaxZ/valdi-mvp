import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'sv'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'sv';

export default getRequestConfig(async ({ requestLocale }) => {
  // Use requestLocale parameter for Next.js 16 compatibility
  const locale = await requestLocale;
  
  // Validate that the incoming locale is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await import(`./messages/${locale}.json`);
  return {
    locale,
    messages: messages.default
  };
});
