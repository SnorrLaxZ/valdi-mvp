import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const runtime = 'nodejs'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound()
  }

  // Load messages
  let messages = {}
  try {
    messages = await getMessages()
  } catch (error) {
    console.error('Error loading messages with getMessages(), trying fallback:', error)
    // Fallback: manually load messages if getMessages fails
    try {
      const messagesModule = await import(`../../messages/${locale}.json`)
      messages = messagesModule.default || {}
    } catch (fallbackError) {
      console.error('Fallback message loading also failed:', fallbackError)
      messages = {}
    }
  }

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

