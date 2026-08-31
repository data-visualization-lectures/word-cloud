import type { FontFamilyId } from '../types'

export interface FontOption {
  id: FontFamilyId
  family: string
  cssStack: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'sans',
    family: 'Noto Sans JP',
    cssStack: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif',
  },
  {
    id: 'serif',
    family: 'Noto Serif JP',
    cssStack: '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif',
  },
  {
    id: 'rounded',
    family: 'M PLUS Rounded 1c',
    cssStack: '"M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif',
  },
]

export const DEFAULT_FONT_FAMILY_ID: FontFamilyId = 'sans'

export const getFontOption = (id: FontFamilyId): FontOption => {
  return FONT_OPTIONS.find((option) => option.id === id) ?? FONT_OPTIONS[0]
}
