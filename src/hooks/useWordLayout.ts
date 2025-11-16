import { useEffect, useMemo, useState } from 'react'
import { forceCollide, forceSimulation, forceX, forceY } from 'd3-force'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import type { ViewMode, WordCloudSettings, WordFrequency } from '../types'
import { getColorScheme } from '../constants/colors'

export interface LayoutWord extends WordFrequency {
  fontSize: number
  x: number
  y: number
  rotate: number
  color: string
  radius: number
}

interface BubbleNode extends WordFrequency {
  radius: number
  x?: number
  y?: number
}

interface LayoutResult {
  layoutWords: LayoutWord[]
  isCalculating: boolean
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

  useEffect(() => {
    if (!width || !height || !words.length) {
      setLayoutWords([])
      setIsCalculating(false)
      return
    }

    setIsCalculating(true)

    const colorScale = scaleOrdinal<string, string>()
      .domain(words.map((word) => word.text))
      .range(getColorScheme(settings.colorSchemeId).colors)

    const radiusScale = scaleLinear()
      .domain([minValue, maxValue])
      .range([Math.min(width, height) * 0.03, Math.min(width, height) * 0.12])

    const nodes: BubbleNode[] = words.map((word) => ({
      ...word,
      radius: radiusScale(word.value),
      x: width / 2,
      y: height / 2,
    }))

    const simulation = forceSimulation<BubbleNode>(nodes)
      .force('x', forceX(width / 2).strength(0.05))
      .force('y', forceY(height / 2).strength(0.05))
      .force('collide', forceCollide<BubbleNode>().radius((d) => d.radius + settings.padding + 2))
      .stop()

    for (let i = 0; i < 300; i += 1) {
      simulation.tick()
    }

    simulation.stop()

    const mapped = nodes.map<LayoutWord>((node) => {
      const clampedX = Math.max(node.radius, Math.min(width - node.radius, node.x ?? width / 2))
      const clampedY = Math.max(node.radius, Math.min(height - node.radius, node.y ?? height / 2))
      const fontSize = mode === 'bubble' ? node.radius * 0.9 : node.radius * 0.75

      return {
        text: node.text,
        value: node.value,
        fontSize,
        radius: node.radius,
        x: clampedX,
        y: clampedY,
        rotate: 0,
        color: colorScale(node.text),
      }
    })

    setLayoutWords(mapped)
    setIsCalculating(false)
  }, [words, width, height, settings, minValue, maxValue, mode])

  return { layoutWords, isCalculating }
}
