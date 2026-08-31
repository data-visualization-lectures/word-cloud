import type { TranslationKey } from '../i18n'
import type { CanvasBackground } from '../types'

export interface ColorScheme {
  id: string
  labelKey: TranslationKey
  colors: string[]
  sequential: [string, string]
  sequentialOnDark: [string, string]
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'vivid',
    labelKey: 'color.vivid',
    colors: ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'],
    sequential: ['#fecaca', '#b91c1c'],
    sequentialOnDark: ['#7f1d1d', '#fecaca'],
  },
  {
    id: 'sunset',
    labelKey: 'color.sunset',
    colors: ['#182844', '#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b'],
    sequential: ['#f5d0c5', '#182844'],
    sequentialOnDark: ['#6d597a', '#fde2d4'],
  },
  {
    id: 'forest',
    labelKey: 'color.forest',
    colors: ['#0f4c5c', '#2c7a7b', '#52b788', '#b7e4c7', '#d9ed92', '#ffef9f'],
    sequential: ['#d8f3dc', '#0f4c5c'],
    sequentialOnDark: ['#1b4332', '#d8f3dc'],
  },
  {
    id: 'mono',
    labelKey: 'color.mono',
    colors: ['#111827', '#1f2937', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
    sequential: ['#d1d5db', '#111827'],
    sequentialOnDark: ['#6b7280', '#f9fafb'],
  },
]

export const DEFAULT_COLOR_SCHEME_ID = 'vivid'

export const CANVAS_BACKGROUND_COLORS: Record<CanvasBackground, string | null> = {
  white: '#ffffff',
  dark: '#0f172a',
  transparent: null,
}

export const getColorScheme = (schemeId: string): ColorScheme => {
  return COLOR_SCHEMES.find(({ id }) => id === schemeId) ?? COLOR_SCHEMES[0]
}

export const getSequentialRange = (
  schemeId: string,
  background: CanvasBackground,
): [string, string] => {
  const scheme = getColorScheme(schemeId)
  return background === 'dark' ? scheme.sequentialOnDark : scheme.sequential
}

export const luminance = (hex: string): number => {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return 0.5
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255
  const toLinear = (channel: number) => (
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export const contrastTextColor = (backgroundHex: string): string => {
  return luminance(backgroundHex) > 0.45 ? '#0f172a' : '#f8fafc'
}
