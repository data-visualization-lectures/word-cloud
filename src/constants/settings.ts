import { DEFAULT_COLOR_SCHEME_ID } from './colors'
import type { StylePresetId, WordCloudSettings } from '../types'

export const DEFAULT_SETTINGS: WordCloudSettings = {
  maxWords: 120,
  fontSizeRange: [18, 78],
  spiral: 'archimedean',
  padding: 2,
  rotationAngles: [0],
  colorSchemeId: DEFAULT_COLOR_SCHEME_ID,
  colorRule: 'frequency',
  aspectRatio: 'landscape',
  enabledPos: ['名詞'],
  excludeNoisePos: true,
  compoundNouns: true,
  compoundMaxLength: 3,
  tokenForm: 'basic',
  minFrequency: 1,
  sizeScale: 'sqrt',
  fontFamilyId: 'sans',
  fontWeight: 700,
  weightByFrequency: true,
  canvasBackground: 'white',
  layoutSeed: 1,
  chartTitle: '',
  chartSource: '',
}

const STYLE_PRESETS: Record<StylePresetId, Partial<WordCloudSettings>> = {
  report: {
    rotationAngles: [0],
    colorRule: 'frequency',
    colorSchemeId: 'mono',
    canvasBackground: 'white',
    aspectRatio: 'landscape',
    fontFamilyId: 'sans',
    fontWeight: 700,
    weightByFrequency: true,
  },
  presentation: {
    rotationAngles: [0, 90],
    colorRule: 'frequency',
    colorSchemeId: 'vivid',
    canvasBackground: 'white',
    aspectRatio: 'landscape',
    fontFamilyId: 'sans',
    fontWeight: 800,
    weightByFrequency: true,
  },
  dark: {
    rotationAngles: [0],
    colorRule: 'frequency',
    colorSchemeId: 'vivid',
    canvasBackground: 'dark',
    aspectRatio: 'landscape',
    fontFamilyId: 'sans',
    fontWeight: 700,
    weightByFrequency: true,
  },
}

export const applyStylePreset = (
  current: WordCloudSettings,
  presetId: StylePresetId,
): WordCloudSettings => {
  return { ...current, ...STYLE_PRESETS[presetId] }
}

export const normalizeSettings = (raw?: Partial<WordCloudSettings> | null): WordCloudSettings => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }

  const enabledPos = Array.isArray(raw.enabledPos) && raw.enabledPos.length > 0
    ? raw.enabledPos
    : DEFAULT_SETTINGS.enabledPos

  const fontSizeRange: [number, number] = Array.isArray(raw.fontSizeRange)
    && raw.fontSizeRange.length === 2
    ? [Number(raw.fontSizeRange[0]), Number(raw.fontSizeRange[1])]
    : DEFAULT_SETTINGS.fontSizeRange

  const rotationAngles = Array.isArray(raw.rotationAngles) && raw.rotationAngles.length > 0
    ? raw.rotationAngles.map(Number)
    : DEFAULT_SETTINGS.rotationAngles

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    enabledPos,
    fontSizeRange,
    rotationAngles,
    compoundMaxLength: clampNumber(raw.compoundMaxLength, 2, 4, DEFAULT_SETTINGS.compoundMaxLength),
    minFrequency: clampNumber(raw.minFrequency, 1, 100, DEFAULT_SETTINGS.minFrequency),
    fontWeight: clampNumber(raw.fontWeight, 500, 900, DEFAULT_SETTINGS.fontWeight),
    layoutSeed: Number.isFinite(raw.layoutSeed) ? Number(raw.layoutSeed) : DEFAULT_SETTINGS.layoutSeed,
    chartTitle: typeof raw.chartTitle === 'string' ? raw.chartTitle : '',
    chartSource: typeof raw.chartSource === 'string' ? raw.chartSource : '',
  }
}

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}
