import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { contrastTextColor, getColorScheme, getSequentialRange } from '../constants/colors'
import { getFontOption } from '../constants/fonts'
import type { WordCloudSettings, WordFrequency } from '../types'

export const TEXT_HEIGHT_RATIO = 0.75

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const getCanvasInsets = (settings: WordCloudSettings) => {
  return {
    top: settings.chartTitle.trim() ? 40 : 12,
    bottom: settings.chartSource.trim() ? 28 : 12,
    left: 12,
    right: 12,
  }
}

const transformValue = (value: number, scale: WordCloudSettings['sizeScale']) => {
  if (scale === 'log') return Math.log1p(Math.max(0, value))
  if (scale === 'sqrt') return Math.sqrt(Math.max(0, value))
  return value
}

export const scaledUnit = (
  value: number,
  minValue: number,
  maxValue: number,
  scale: WordCloudSettings['sizeScale'],
) => {
  const tMin = transformValue(minValue, scale)
  const tMax = transformValue(maxValue, scale)
  const span = tMax - tMin
  if (span <= 0) return 1
  return (transformValue(value, scale) - tMin) / span
}

export const fontSizeForValue = (
  value: number,
  minValue: number,
  maxValue: number,
  settings: WordCloudSettings,
) => {
  const unit = scaledUnit(value, minValue, maxValue, settings.sizeScale)
  const [minSize, maxSize] = settings.fontSizeRange
  return minSize + unit * (maxSize - minSize)
}

export const fontWeightForValue = (
  value: number,
  minValue: number,
  maxValue: number,
  settings: WordCloudSettings,
) => {
  if (!settings.weightByFrequency) return settings.fontWeight
  const unit = scaledUnit(value, minValue, maxValue, settings.sizeScale)
  const minWeight = Math.min(500, settings.fontWeight)
  const weight = minWeight + unit * (settings.fontWeight - minWeight)
  return Math.round(weight / 100) * 100
}

let measureContext: CanvasRenderingContext2D | null = null

export const measureTextWidth = (
  text: string,
  fontSize: number,
  settings: WordCloudSettings,
  fontWeight = settings.fontWeight,
) => {
  if (typeof document === 'undefined') return text.length * fontSize * 0.9
  if (!measureContext) {
    measureContext = document.createElement('canvas').getContext('2d')
  }
  if (!measureContext) return text.length * fontSize * 0.9
  const font = getFontOption(settings.fontFamilyId)
  measureContext.font = `${fontWeight} ${fontSize}px ${font.cssStack}`
  return measureContext.measureText(text).width
}

export const createWordColorScale = (
  settings: WordCloudSettings,
  words: WordFrequency[],
  minValue: number,
  maxValue: number,
) => {
  const scheme = getColorScheme(settings.colorSchemeId)

  if (settings.colorRule === 'pos') {
    const posColors: Record<string, string> = {
      名詞: scheme.colors[0],
      動詞: scheme.colors[1] ?? scheme.colors[0],
      形容詞: scheme.colors[2] ?? scheme.colors[0],
      副詞: scheme.colors[3] ?? scheme.colors[0],
    }
    return (word: WordFrequency) => posColors[word.pos ?? '名詞'] ?? '#6b7280'
  }

  if (settings.colorRule === 'frequency') {
    const range = getSequentialRange(settings.colorSchemeId, settings.canvasBackground)
    const frequencyColorScale = scaleLinear<string>().domain([minValue, maxValue]).range(range)
    return (word: WordFrequency) => frequencyColorScale(word.value)
  }

  const schemeColorScale = scaleOrdinal<string, string>()
    .domain(words.map((word) => word.text))
    .range(scheme.colors)
  return (word: WordFrequency) => schemeColorScale(word.text)
}

export const contrastingLabel = (fill: string) => contrastTextColor(fill)

export const POS_LEGEND_ITEMS: Array<{ pos: string; labelKey: 'controls.posNoun' | 'controls.posVerb' | 'controls.posAdj' | 'controls.posAdv' }> = [
  { pos: '名詞', labelKey: 'controls.posNoun' },
  { pos: '動詞', labelKey: 'controls.posVerb' },
  { pos: '形容詞', labelKey: 'controls.posAdj' },
  { pos: '副詞', labelKey: 'controls.posAdv' },
]
