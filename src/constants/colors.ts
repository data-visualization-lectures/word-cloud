export interface ColorScheme {
  id: string
  label: string
  colors: string[]
  description?: string
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'vivid',
    label: 'ビビッド',
    colors: ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'],
  },
  {
    id: 'sunset',
    label: 'サンセット',
    colors: ['#182844', '#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b'],
  },
  {
    id: 'forest',
    label: 'フォレスト',
    colors: ['#0f4c5c', '#2c7a7b', '#52b788', '#b7e4c7', '#d9ed92', '#ffef9f'],
  },
  {
    id: 'mono',
    label: 'モノトーン',
    colors: ['#111827', '#1f2937', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
  },
]

export const DEFAULT_COLOR_SCHEME_ID = 'vivid'

export const getColorScheme = (schemeId: string): ColorScheme => {
  return COLOR_SCHEMES.find(({ id }) => id === schemeId) ?? COLOR_SCHEMES[0]
}
