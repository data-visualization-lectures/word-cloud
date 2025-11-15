import { useEffect, useMemo, useState } from 'react'
import cloud, { type Word as CloudWord } from 'd3-cloud'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import type { WordCloudSettings, WordFrequency } from '../types'
import { getColorScheme } from '../constants/colors'

export interface LayoutWord extends WordFrequency {
  fontSize: number
  x: number
  y: number
  rotate: number
  color: string
}

interface LayoutResult {
  layoutWords: LayoutWord[]
  isCalculating: boolean
}

const pickRotation = (angles: number[]): number => {
  if (!angles.length) return 0
  const index = Math.floor(Math.random() * angles.length)
  return angles[index] ?? 0
}

export const useWordCloudLayout = (
  words: WordFrequency[],
  width: number,
  height: number,
  settings: WordCloudSettings,
): LayoutResult => {
  const [layoutWords, setLayoutWords] = useState<LayoutWord[]>([])
  const [isCalculating, setIsCalculating] = useState(false)

  const [minValue, maxValue] = useMemo(() => {
    if (!words.length) return [0, 1]
    const values = words.map((word) => word.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    if (min === max) {
      return [min, max + 1]
    }
    return [min, max]
  }, [words])

  const scaledFontRange = useMemo<[number, number]>(() => {
    const baseArea = 800 * 480
    const area = Math.max(width * height, 1)
    const scaleFactor = Math.min(2, Math.max(0.6, Math.sqrt(area / baseArea)))
    return [settings.fontSizeRange[0] * scaleFactor, settings.fontSizeRange[1] * scaleFactor]
  }, [width, height, settings.fontSizeRange])

  useEffect(() => {
    if (!width || !height || !words.length) {
      setLayoutWords([])
      setIsCalculating(false)
      return
    }

    setIsCalculating(true)

    const colorScheme = getColorScheme(settings.colorSchemeId)
    const colorScale = scaleOrdinal<string, string>()
      .domain(words.map((word) => word.text))
      .range(colorScheme.colors)

    const fontScale = scaleLinear().domain([minValue, maxValue]).range(scaledFontRange)

    let cancelled = false

    const layout = cloud<WordFrequency>()
      .size([width, height])
      .words(words.map((word) => ({ ...word })))
      .padding(settings.padding)
      .spiral(settings.spiral)
      .rotate(() => pickRotation(settings.rotationAngles))
      .font('Noto Sans JP, system-ui, sans-serif')
      .fontSize((word) => fontScale(word.value))

    layout.on('end', (result: Array<CloudWord & WordFrequency>) => {
      if (cancelled) return

      const mapped = result.map<LayoutWord>((word) => ({
        text: word.text,
        value: word.value ?? 0,
        fontSize: word.size ?? scaledFontRange[0],
        x: (word.x ?? 0) + width / 2,
        y: (word.y ?? 0) + height / 2,
        rotate: word.rotate ?? 0,
        color: colorScale(word.text),
      }))

      setLayoutWords(mapped)
      setIsCalculating(false)
    })

    layout.start()

    return () => {
      cancelled = true
      layout.stop()
    }
  }, [words, width, height, settings, minValue, maxValue, scaledFontRange])

  return { layoutWords, isCalculating }
}
