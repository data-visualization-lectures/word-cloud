import { createContext, useContext, useMemo, type ReactNode } from 'react'
import translations, { type Locale, type TranslationKey } from './translations'

interface I18nContextValue {
  locale: Locale
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectLocale(): Locale {
  return navigator.language.startsWith('ja') ? 'ja' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useMemo(() => detectLocale(), [])

  const t = useMemo(() => {
    return (key: TranslationKey, vars?: Record<string, string | number>) => {
      const entry = translations[key]
      let str: string = entry[locale]
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replaceAll(`{${k}}`, String(v))
        }
      }
      return str
    }
  }, [locale])

  useMemo(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
