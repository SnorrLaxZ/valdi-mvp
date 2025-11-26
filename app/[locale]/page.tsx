import Link from 'next/link'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'

export const dynamic = 'force-dynamic'

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  
  // Directly load messages since next-intl config isn't being found
  let messages: any = {}
  try {
    const messagesModule = await import(`../../messages/${locale}.json`)
    messages = messagesModule.default || {}
  } catch (error) {
    console.error('Error loading messages:', error)
  }
  
  // Create translation function
  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-indigo-600">Valdi</div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <Link 
              href={`/${locale}/login`}
              className="text-gray-700 hover:text-indigo-600 transition"
            >
              {t('auth.login')}
            </Link>
            <Link 
              href={`/${locale}/signup`}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              {t('home.getStarted')}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            {t('home.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {t('home.subtitle')}
          </p>
          
          <div className="flex justify-center gap-4 mb-16">
            <Link 
              href={`/${locale}/signup?type=company`}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition"
            >
              {t('home.forCompanies')}
            </Link>
            <Link 
              href={`/${locale}/signup?type=sdr`}
              className="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition"
            >
              {t('home.forSdrs')}
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">{t('home.quickStart')}</h3>
              <p className="text-gray-600">
                {t('home.quickStartDesc')}
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">{t('home.payPerMeeting')}</h3>
              <p className="text-gray-600">
                {t('home.payPerMeetingDesc')}
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2">{t('home.preApprovedSdrs')}</h3>
              <p className="text-gray-600">
                {t('home.preApprovedSdrsDesc')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>{t('home.copyright')}</p>
      </footer>
    </div>
  )
}

