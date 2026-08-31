import { CANVAS_BACKGROUND_COLORS, contrastTextColor } from '../constants/colors'
import { getFontOption } from '../constants/fonts'
import type { ViewMode, WordCloudSettings } from '../types'

export interface DrawableWord {
  text: string
  x: number
  y: number
  rotate: number
  fontSize: number
  fontWeight: number
  color: string
  radius: number
  showLabel: boolean
  textColor?: string
}

export interface DrawOptions {
  layoutWords: DrawableWord[]
  width: number
  height: number
  settings: WordCloudSettings
  viewMode: ViewMode
  scale?: number
  backgroundColor?: string | null
}

const waitForFonts = async () => {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    await document.fonts.ready
  } catch {
    // Ignore font loading failures and continue with fallbacks.
  }
}

export function drawVisualizationToCanvas({
  layoutWords,
  width,
  height,
  settings,
  viewMode,
  scale = 1,
  backgroundColor,
}: DrawOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  ctx.scale(scale, scale)
  const resolvedBackground = backgroundColor
    ?? CANVAS_BACKGROUND_COLORS[settings.canvasBackground]
  if (resolvedBackground) {
    ctx.fillStyle = resolvedBackground
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.clearRect(0, 0, width, height)
  }

  const font = getFontOption(settings.fontFamilyId)
  const titleColor = settings.canvasBackground === 'dark' ? '#f8fafc' : '#0f172a'
  if (settings.chartTitle.trim()) {
    ctx.fillStyle = titleColor
    ctx.font = `700 18px ${font.cssStack}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(settings.chartTitle.trim(), 16, 12)
  }
  if (settings.chartSource.trim()) {
    ctx.fillStyle = settings.canvasBackground === 'dark' ? '#94a3b8' : '#64748b'
    ctx.font = `500 12px ${font.cssStack}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(settings.chartSource.trim(), width - 16, height - 10)
  }

  for (const word of layoutWords) {
    if (viewMode === 'bubble' && word.radius > 0) {
      ctx.beginPath()
      ctx.arc(word.x, word.y, word.radius, 0, Math.PI * 2)
      ctx.fillStyle = word.color
      ctx.fill()
    }

    if (viewMode === 'bubble' && !word.showLabel) continue

    ctx.save()
    ctx.translate(word.x, word.y)
    ctx.rotate((word.rotate * Math.PI) / 180)
    ctx.fillStyle = viewMode === 'bubble'
      ? (word.textColor ?? contrastTextColor(word.color))
      : word.color
    ctx.font = `${word.fontWeight} ${word.fontSize}px ${font.cssStack}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(word.text, 0, 0)
    ctx.restore()
  }

  return canvas
}

export async function visualizationToPngBlob(options: DrawOptions): Promise<Blob> {
  await waitForFonts()
  const canvas = drawVisualizationToCanvas(options)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create PNG blob'))
    }, 'image/png')
  })
}

export async function svgToPngBlob(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  backgroundColor = '#ffffff',
  scale = 1,
): Promise<Blob> {
  await waitForFonts()
  return new Promise((resolve, reject) => {
    try {
      const clone = svgElement.cloneNode(true) as SVGSVGElement
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', String(width))
      clone.setAttribute('height', String(height))
      const serializer = new XMLSerializer()
      const source = serializer.serializeToString(clone)
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const image = new Image()
      image.crossOrigin = 'anonymous'

      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.scale(scale, scale)
        if (backgroundColor) {
          ctx.fillStyle = backgroundColor
          ctx.fillRect(0, 0, width, height)
        }

        ctx.drawImage(image, 0, 0, width, height)

        canvas.toBlob((pngBlob) => {
          URL.revokeObjectURL(url)
          if (pngBlob) resolve(pngBlob)
          else reject(new Error('Failed to create PNG blob'))
        }, 'image/png')
      }

      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load SVG image'))
      }

      image.src = url
    } catch (err) {
      reject(err)
    }
  })
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export const downloadFileName = (base: string, extension: string, projectName?: string) => {
  const date = new Date().toISOString().slice(0, 10)
  const safeName = (projectName || base)
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
    .slice(0, 40) || base
  return `${safeName}-${date}.${extension}`
}
