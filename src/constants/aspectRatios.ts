import type { TranslationKey } from '../i18n'

export const ASPECT_RATIOS: { id: 'square' | 'portrait' | 'landscape'; labelKey: TranslationKey; ratio: number }[] = [
    { id: 'square', labelKey: 'aspect.square', ratio: 1 },
    { id: 'portrait', labelKey: 'aspect.portrait', ratio: 3 / 4 },
    { id: 'landscape', labelKey: 'aspect.landscape', ratio: 16 / 9 },
]

export const DEFAULT_ASPECT_RATIO = 'landscape'
