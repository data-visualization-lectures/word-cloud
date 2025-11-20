import { useEffect, useMemo, useState } from 'react'
import { forceCollide, forceSimulation, forceX, forceY } from 'd3-force'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import cloud from 'd3-cloud'
import type { ViewMode, WordCloudSettings, WordFrequency } from '../types'
import { getColorScheme } from '../constants/colors'

export interface LayoutWord extends WordFrequency {
  fontSize: number
  x: number
  y: number
  rotate: number
  color: string
  radius: number
  width?: number
  height?: number
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
const MAX_RECT_RESOLUTION_ITERATIONS = 60
const TEXT_HEIGHT_RATIO = 0.88

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
): LayoutWord[] => {
  if (words.length <= 1) return words

  const nodes = words.map((word) => ({
    ...word,
    width: word.width ?? word.fontSize,
    height: (word.height ?? word.fontSize) * TEXT_HEIGHT_RATIO,
  }))

  const paddingOffset = Math.max(0, padding)
  const maxFontSize = Math.max(...nodes.map((node) => node.fontSize), 1)

  for (let iteration = 0; iteration < MAX_RECT_RESOLUTION_ITERATIONS; iteration += 1) {
    let moved = false

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = (b.x - a.x) || (Math.random() > 0.5 ? 1 : -1) * 0.1
        const dy = (b.y - a.y) || (Math.random() > 0.5 ? 1 : -1) * 0.1

        const overlapX = a.width / 2 + b.width / 2 + paddingOffset - Math.abs(dx)
        const overlapY = a.height / 2 + b.height / 2 + paddingOffset - Math.abs(dy)

        if (overlapX > 0 && overlapY > 0) {
          moved = true
          const totalWeight = a.fontSize + b.fontSize || 1
          const weightA = b.fontSize / totalWeight
          const weightB = a.fontSize / totalWeight

          if (overlapX < overlapY) {
            const direction = dx > 0 ? 1 : -1
            const shift = overlapX * 0.55
            a.x -= shift * direction * weightA
            b.x += shift * direction * weightB
          } else {
            const direction = dy > 0 ? 1 : -1
            const shift = overlapY * 0.55
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

    if (!moved) {
      break
    }
  }

  return nodes
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

  const fontSizeRange = useMemo(
    () => settings.fontSizeRange,
    [settings.fontSizeRange[0], settings.fontSizeRange[1]],
  )

  const rotationAngles = useMemo(() => settings.rotationAngles, [settings.rotationAngles.join(',')])

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

    if (mode === 'bubble') {
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
        const fontSize = node.radius * 0.9

        const textHeight = fontSize * TEXT_HEIGHT_RATIO
        return {
          text: node.text,
          value: node.value,
          fontSize,
          radius: node.radius,
          x: clampedX,
          y: clampedY,
          rotate: 0,
          color: colorScale(node.text),
          width: fontSize,
          height: textHeight,
        }
      })

      setLayoutWords(mapped)
      setIsCalculating(false)
      return
    }

    let isCancelled = false
    const effectiveRotationAngles = rotationAngles.length > 0 ? rotationAngles : ([0] as number[])

    const createLayout = () => cloud<CloudWord>()
    type CloudLayoutInstance = ReturnType<typeof createLayout>
    const layoutInstances: CloudLayoutInstance[] = []

    const attemptLayout = (range: [number, number], attempt = 0) => {
      const fontScale = scaleLinear()
        .domain([minValue, maxValue])
        .range(range)

      const layout = createLayout()
        .size([width, height])
        .words(words.map((word) => ({ ...word })))
        .padding(settings.padding)
        .rotate(() => {
          const index = Math.floor(Math.random() * effectiveRotationAngles.length)
          const baseAngle = effectiveRotationAngles[index]
          if (!baseAngle) return 0
          const sign = Math.random() < 0.5 ? -1 : 1
          return baseAngle * sign
        })
        .spiral(settings.spiral)
        .fontSize((d) => fontScale(d.value))

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

        // Calculate bounding box of the generated cloud
        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity

        generated.forEach((word) => {
          const x = word.x ?? 0
          const y = word.y ?? 0
          // Use a rough estimate for word dimensions if not available
          // d3-cloud usually provides width/height but sometimes only size
          const w = word.width ?? (word.size ?? 0)
          // Height is often smaller than size due to font metrics, but let's be safe
          const h = (word.height ?? (word.size ?? 0)) * TEXT_HEIGHT_RATIO

          // Consider rotation
          // Simple bounding box for rotated rectangle is complex,
          // but we can use a safe approximation or check rotation
          // For 0 and 90 degrees it's simple.
          // For now, let's assume simple bounding box based on center x,y
          // This is an approximation but sufficient for scaling
          const halfW = w / 2
          const halfH = h / 2

          // If rotated 90 degrees (vertical), swap width and height
          const isVertical = Math.abs(word.rotate ?? 0) === 90
          const effectiveHalfW = isVertical ? halfH : halfW
          const effectiveHalfH = isVertical ? halfW : halfH

          minX = Math.min(minX, x - effectiveHalfW)
          maxX = Math.max(maxX, x + effectiveHalfW)
          minY = Math.min(minY, y - effectiveHalfH)
          maxY = Math.max(maxY, y + effectiveHalfH)
        })

        // Calculate scale to fit canvas
        const cloudWidth = maxX - minX
        const cloudHeight = maxY - minY

        // Avoid division by zero
        const safeCloudWidth = Math.max(cloudWidth, 1)
        const safeCloudHeight = Math.max(cloudHeight, 1)

        const availableWidth = Math.max(width - settings.padding * 2, 1)
        const availableHeight = Math.max(height - settings.padding * 2, 1)

        const scaleX = availableWidth / safeCloudWidth
        const scaleY = availableHeight / safeCloudHeight

        // Use the smaller scale to fit both dimensions, but allow some zoom
        // Cap the scale to avoid extreme zooming for few words
        const scale = Math.min(scaleX, scaleY, 5)

        const mapped = generated.map<LayoutWord>((word) => {
          const baseFontSize = word.size ?? fontScale(word.value)
          const scaledFontSize = baseFontSize * scale

          // Scale coordinates. 
          // Center the cloud: (x - center of cloud) * scale + center of canvas
          const cloudCenterX = (minX + maxX) / 2
          const cloudCenterY = (minY + maxY) / 2

          const x = ((word.x ?? 0) - cloudCenterX) * scale + width / 2
          const y = ((word.y ?? 0) - cloudCenterY) * scale + height / 2

          const resolvedWidth = (word.width ?? baseFontSize) * scale
          const resolvedHeight = (word.height ?? baseFontSize) * TEXT_HEIGHT_RATIO * scale

          return {
            text: word.text ?? '',
            value: word.value,
            fontSize: scaledFontSize,
            radius: 0,
            x,
            y,
            rotate: word.rotate ?? 0,
            color: colorScale(word.text ?? ''),
            width: resolvedWidth,
            height: resolvedHeight,
          }
        })

        const finalWords = hasOverlap(mapped)
          ? resolveWordOverlaps(mapped, width, height, settings.padding)
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
    rotationAngles,
    settings.colorSchemeId,
    minValue,
    maxValue,
    mode,
  ])

  return { layoutWords, isCalculating }
}
