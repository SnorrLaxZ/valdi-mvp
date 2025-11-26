'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'

interface NavItem {
  href: string
  label: string
  icon?: ReactNode
}

interface SidebarLayoutProps {
  title: string
  subtitle?: string
  navItems: NavItem[]
  activePath: string
  children: ReactNode
}

export function SidebarLayout({ title, subtitle, navItems, activePath, children }: SidebarLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push(`/${locale}`)
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <Link href={navItems[0]?.href || '#'} className="text-xl font-semibold text-gray-900">
            Valdi
          </Link>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        <nav className="mt-8 px-4">
          {navItems.map((item) => {
            const isActive = activePath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2.5 rounded-md mb-1 text-sm transition ${
                  isActive
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.icon && <span className="mr-2 inline-block">{item.icon}</span>}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 space-y-2">
          <div className="px-3">
            <LanguageSwitcher />
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
          >
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 bg-white">
        {children}
      </main>
    </div>
  )
}


