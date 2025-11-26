import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-indigo-600">Valdi</div>
          <div className="space-x-4">
            <Link 
              href="/login" 
              className="text-gray-700 hover:text-indigo-600 transition"
            >
              Logga in
            </Link>
            <Link 
              href="/signup" 
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Kom igång
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            On-Demand B2B Mötesbokningar
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Få tillgång till förgodkända SDR:er. Betala endast per kvalificerat möte. 
            Pausa när som helst. Ingen bindningstid.
          </p>
          
          <div className="flex justify-center gap-4 mb-16">
            <Link 
              href="/signup?type=company"
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition"
            >
              För Företag
            </Link>
            <Link 
              href="/signup?type=sdr"
              className="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition"
            >
              För SDR:er
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">Snabb Start</h3>
              <p className="text-gray-600">
                Börja få möten inom dagar, inte månader
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">Betala Per Möte</h3>
              <p className="text-gray-600">
                Endast €300 per kvalificerat möte. Inga retainers.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2">Förgodkända SDR:er</h3>
              <p className="text-gray-600">
                Varje SDR är granskad och kvalitetssäkrad
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>© 2025 Valdi. Alla rättigheter förbehållna.</p>
      </footer>
    </div>
  )
}