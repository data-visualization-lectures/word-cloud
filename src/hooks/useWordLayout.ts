import { useEffect, useState } from 'react'
import { hierarchy, pack } from 'd3-hierarchy'
import cloud from 'd3-cloud'
import type { ViewMode, WordCloudSettings, WordFrequency } from '../types'
import { getFontOption } from '../constants/fonts'
import {
  TEXT_HEIGHT_RATIO,
  contrastingLabel,
  createWordColorScale,
  fontSizeForValue,
  fontWeightForValue,
  getCanvasInsets,
  measureTextWidth,
  mulberry32,
} from '../lib/layout'

export interface LayoutWord extends WordFrequency {
  fontSize: number
  fontWeight: number
  x: number
  y: number
  rotate: number
  color: string
  radius: number
  width?: number
  height?: number
  showLabel: boolean
  textColor?: string
}

interface LayoutResult {
  layoutWords: LayoutWord[]
  isCalculating: boolean
}

type CloudWord = WordFrequency & {
  size?: number
  x?: number
  y?: number
  rotate?: number
  width?: number
  height?: number
}

const MAX_CLOUD_ATTEMPTS = 5
const FONT_SCALE_FACTOR = 0.9
const MAX_RECT_RESOLUTION_ITERATIONS = 120

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}

const hasOverlap = (words: LayoutWord[]): boolean => {
  for (let i = 0; i < words.length; i += 1) {
    const a = words[i]
    const aWidth = a.width ?? a.fontSize
    const aHeight = a.height ?? a.fontSize * TEXT_HEIGHT_RATIO
    const aHalfWidth = aWidth / 2
    const aHalfHeight = aHeight / 2
    const aMinX = a.x - aHalfWidth
    const aMaxX = a.x + aHalfWidth
    const aMinY = a.y - aHalfHeight
    const aMaxY = a.y + aHalfHeight
    for (let j = i + 1; j < words.length; j += 1) {
      const b = words[j]
      const bWidth = b.width ?? b.fontSize
      const bHeight = b.height ?? b.fontSize * TEXT_HEIGHT_RATIO
      const bHalfWidth = bWidth / 2
      const bHalfHeight = bHeight / 2
      const bMinX = b.x - bHalfWidth
      const bMaxX = b.x + bHalfWidth
      const bMinY = b.y - bHalfHeight
      const bMaxY = b.y + bHalfHeight
      const overlaps = aMinX < bMaxX && aMaxX > bMinX && aMinY < bMaxY && aMaxY > bMinY
      if (overlaps) return true
    }
  }
  return false
}

const resolveWordOverlaps = (
  words: LayoutWord[],
  width: number,
  height: number,
  padding: number,
  rng: () => number,
): LayoutWord[] => {
  if (words.length <= 1) return words

  const nodes = words.map((word) => ({
    ...word,
    width: word.width ?? word.fontSize,
    height: word.height ?? word.fontSize * TEXT_HEIGHT_RATIO,
  }))

  const paddingOffset = Math.max(2, padding * 1.5)
  const maxFontSize = Math.max(...nodes.map((node) => node.fontSize), 1)

  for (let iteration = 0; iteration < MAX_RECT_RESOLUTION_ITERATIONS; iteration += 1) {
    let moved = false

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = (b.x - a.x) || (rng() > 0.5 ? 1 : -1) * 0.1
        const dy = (b.y - a.y) || (rng() > 0.5 ? 1 : -1) * 0.1

        const overlapX = a.width / 2 + b.width / 2 + paddingOffset - Math.abs(dx)
        const overlapY = a.height / 2 + b.height / 2 + paddingOffset - Math.abs(dy)

        if (overlapX > 0 && overlapY > 0) {
          moved = true
          const totalWeight = a.fontSize + b.fontSize || 1
          const weightA = b.fontSize / totalWeight
          const weightB = a.fontSize / totalWeight

          if (overlapX < overlapY) {
            const direction = dx > 0 ? 1 : -1
            const shift = overlapX * 0.8
            a.x -= shift * direction * weightA
            b.x += shift * direction * weightB
          } else {
            const direction = dy > 0 ? 1 : -1
            const shift = overlapY * 0.8
            a.y -= shift * direction * weightA
            b.y += shift * direction * weightB
          }
        }
      }
    }

    nodes.forEach((node) => {
      const weight = node.fontSize / maxFontSize
      const centerX = width / 2
      const centerY = height / 2
      const attraction = 0.02 * weight
      node.x += (centerX - node.x) * attraction
      node.y += (centerY - node.y) * attraction

      const halfWidth = node.width / 2
      const halfHeight = node.height / 2
      node.x = clamp(node.x, halfWidth, width - halfWidth)
      node.y = clamp(node.y, halfHeight, height - halfHeight)
    })

    if (!moved) break
  }

  return nodes
}

const layoutBubbles = (
  words: WordFrequency[],
  width: number,
  height: number,
  settings: WordCloudSettings,
  colorScale: (word: WordFrequency) => string,
  minValue: number,
  maxValue: number,
): LayoutWord[] => {
  const insets = getCanvasInsets(settings)
  const innerWidth = Math.max(width - insets.left - insets.right, 1)
  const innerHeight = Math.max(height - insets.top - insets.bottom, 1)

  const root = hierarchy<{ children?: WordFrequency[]; text?: string; value?: number; pos?: string }>({
    children: words,
  }).sum((node) => node.value ?? 0)

  const packed = pack<typeof root.data>()
    .size([innerWidth, innerHeight])
    .padding(Math.max(1, settings.padding))(root)

  return packed.leaves().flatMap((node) => {
    const text = node.data.text
    const value = node.data.value
    if (!text || value == null) return []
    const word: WordFrequency = { text, value, pos: node.data.pos }
    const color = colorScale(word)
    const fontWeight = fontWeightForValue(word.value, minValue, maxValue, settings)
    const maxWidth = node.r * 2 * 0.86
    let fontSize = Math.min(node.r * 0.42, settings.fontSizeRange[1])
    let textWidth = measureTextWidth(word.text, fontSize, settings, fontWeight)
    while (fontSize > 8 && (textWidth > maxWidth || fontSize * TEXT_HEIGHT_RATIO > node.r * 1.15)) {
      fontSize -= 1
      textWidth = measureTextWidth(word.text, fontSize, settings, fontWeight)
    }
    const showLabel = textWidth <= maxWidth && fontSize >= 8
    return [{
      text: word.text,
      value: word.value,
      pos: word.pos,
      fontSize: showLabel ? fontSize : 0,
      fontWeight,
      radius: node.r,
      x: node.x + insets.left,
      y: node.y + insets.top,
      rotate: 0,
      color,
      width: node.r * 2,
      height: node.r * 2,
      showLabel,
      textColor: contrastingLabel(color),
    }]
  })
}

export const useWordLayout = (
  words: WordFrequency[],
  width: number,
  height: number,
  settings: WordCloudSettings,
  mode: ViewMode,
): LayoutResult => {
  const [layoutWords, setLayoutWords] = useState<LayoutWord[]>([])
  const [isCalculating, setIsCalculating] = useState(false)

  const [minValue, maxValue] = (() => {
    if (!words.length) return [0, 1] as const
    const values = words.map((word) => word.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    if (min === max) return [min, max + 1] as const
    return [min, max] as const
  })()

  const fontSizeRange = settings.fontSizeRange
  const rotationAngles = settings.rotationAngles

  useEffect(() => {
    if (!width || !height || !words.length) {
      setLayoutWords([])
      setIsCalculating(false)
      return
    }

    setIsCalculating(true)
    const colorScale = createWordColorScale(settings, words, minValue, maxValue)
    const rng = mulberry32(settings.layoutSeed || 1)

    if (mode === 'bubble') {
      const mapped = layoutBubbles(words, width, height, settings, colorScale, minValue, maxValue)
      setLayoutWords(mapped)
      setIsCalculating(false)
      return
    }

    let isCancelled = false
    const effectiveRotationAngles = rotationAngles.length > 0 ? rotationAngles : [0]
    const fontFamily = getFontOption(settings.fontFamilyId).family
    const insets = getCanvasInsets(settings)
    const layoutWidth = Math.max(width - insets.left - insets.right, 1)
    const layoutHeight = Math.max(height - insets.top - insets.bottom, 1)

    const createLayout = () => cloud<CloudWord>()
    type CloudLayoutInstance = ReturnType<typeof createLayout>
    const layoutInstances: CloudLayoutInstance[] = []

    const attemptLayout = (range: [number, number], attempt = 0) => {
      const layout = createLayout()
        .size([layoutWidth, layoutHeight])
        .words(words.map((word) => ({ ...word })))
        .padding(settings.padding)
        .rotate(() => {
          const index = Math.floor(rng() * effectiveRotationAngles.length)
          const baseAngle = effectiveRotationAngles[index] ?? 0
          if (!baseAngle) return 0
          const sign = rng() < 0.5 ? -1 : 1
          return baseAngle * sign
        })
        .spiral(settings.spiral)
        .font(fontFamily)
        .fontWeight((d) => fontWeightForValue(d.value, minValue, maxValue, settings))
        .fontSize((d) => {
          const unitSize = fontSizeForValue(d.value, minValue, maxValue, settings)
          const scale = range[1] / Math.max(fontSizeRange[1], 1)
          return unitSize * scale
        })

      layoutInstances.push(layout)

      layout.on('end', (generated) => {
        if (isCancelled) return
        const isIncomplete = generated.length < words.length
        const shouldRetry = isIncomplete && attempt < MAX_CLOUD_ATTEMPTS
        if (shouldRetry) {
          const nextRange: [number, number] = [
            range[0] * FONT_SCALE_FACTOR,
            range[1] * FONT_SCALE_FACTOR,
          ]
          attemptLayout(nextRange, attempt + 1)
          return
        }

        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity

        generated.forEach((word) => {
          const x = word.x ?? 0
          const y = word.y ?? 0
          const w = word.width ?? (word.size ?? 0)
          const h = (word.height ?? (word.size ?? 0)) * TEXT_HEIGHT_RATIO
          const halfW = w / 2
          const halfH = h / 2
          const isVertical = Math.abs(word.rotate ?? 0) === 90
          const effectiveHalfW = isVertical ? halfH : halfW
          const effectiveHalfH = isVertical ? halfW : halfH
          minX = Math.min(minX, x - effectiveHalfW)
          maxX = Math.max(maxX, x + effectiveHalfW)
          minY = Math.min(minY, y - effectiveHalfH)
          maxY = Math.max(maxY, y + effectiveHalfH)
        })

        const cloudWidth = maxX - minX
        const cloudHeight = maxY - minY
        const safeCloudWidth = Math.max(cloudWidth, 1)
        const safeCloudHeight = Math.max(cloudHeight, 1)
        const availableWidth = Math.max(layoutWidth - settings.padding * 2, 1)
        const availableHeight = Math.max(layoutHeight - settings.padding * 2, 1)
        const scale = Math.min(availableWidth / safeCloudWidth, availableHeight / safeCloudHeight, 5)
        const cloudCenterX = (minX + maxX) / 2
        const cloudCenterY = (minY + maxY) / 2

        const mapped = generated.map<LayoutWord>((word) => {
          const baseFontSize = word.size ?? fontSizeForValue(word.value, minValue, maxValue, settings)
          const scaledFontSize = baseFontSize * scale
          const x = ((word.x ?? 0) - cloudCenterX) * scale + insets.left + layoutWidth / 2
          const y = ((word.y ?? 0) - cloudCenterY) * scale + insets.top + layoutHeight / 2
          const color = colorScale({ text: word.text ?? '', value: word.value, pos: word.pos })
          return {
            text: word.text ?? '',
            value: word.value,
            pos: word.pos,
            fontSize: scaledFontSize,
            fontWeight: fontWeightForValue(word.value, minValue, maxValue, settings),
            radius: 0,
            x,
            y,
            rotate: word.rotate ?? 0,
            color,
            width: (word.width ?? baseFontSize) * scale,
            height: (word.height ?? baseFontSize) * TEXT_HEIGHT_RATIO * scale,
            showLabel: true,
            textColor: color,
          }
        })

        const finalWords = hasOverlap(mapped)
          ? resolveWordOverlaps(mapped, width, height, settings.padding, rng)
          : mapped

        setLayoutWords(finalWords)
        setIsCalculating(false)
      })

      layout.start()
    }

    attemptLayout(fontSizeRange)

    return () => {
      isCancelled = true
      layoutInstances.forEach((instance) => instance.stop())
    }
  }, [
    words,
    width,
    height,
    fontSizeRange,
    settings.padding,
    settings.spiral,
    settings.fontFamilyId,
    settings.fontWeight,
    settings.weightByFrequency,
    settings.sizeScale,
    settings.layoutSeed,
    settings.chartTitle,
    settings.chartSource,
    rotationAngles,
    minValue,
    maxValue,
    mode,
  ])

  useEffect(() => {
    if (!layoutWords.length) return
    const colorScale = createWordColorScale(settings, words, minValue, maxValue)
    setLayoutWords((prevWords) =>
      prevWords.map((word) => {
        const color = colorScale({ text: word.text, value: word.value, pos: word.pos })
        return {
          ...word,
          color,
          textColor: mode === 'bubble' ? contrastingLabel(color) : color,
        }
      }),
    )
  }, [settings.colorSchemeId, settings.colorRule, settings.canvasBackground, words, minValue, maxValue, mode])

  return { layoutWords, isCalculating }
}
