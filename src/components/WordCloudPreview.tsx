import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { select } from 'd3-selection'
import { transition } from 'd3-transition'
import type { ViewMode, WordCloudSettings, WordFrequency, AspectRatio } from '../types'
import { useWordLayout, type LayoutWord } from '../hooks/useWordLayout'
import { ASPECT_RATIOS } from '../constants/aspectRatios'
import { COLOR_SCHEMES } from '../constants/colors'
import { svgToPngBlob } from '../lib/image-utils'


export interface WordCloudPreviewHandle {
  getThumbnailBlob: () => Promise<Blob | null>
}

interface WordCloudPreviewProps {
  words: WordFrequency[]
  settings: WordCloudSettings
  statusMessage: string | null
  viewMode: ViewMode
  showBoundingBoxes: boolean
  onAspectRatioChange: (ratio: AspectRatio) => void
  onViewModeChange: (mode: ViewMode) => void
  onColorSchemeChange: (schemeId: string) => void
  onColorRuleChange: (rule: WordCloudSettings['colorRule']) => void
}

export const WordCloudPreview = forwardRef<WordCloudPreviewHandle, WordCloudPreviewProps>(({
  words,
  settings,
  statusMessage,
  viewMode,
  showBoundingBoxes,
  onAspectRatioChange,
  onViewModeChange,
  onColorSchemeChange,
  onColorRuleChange,
}, ref) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const aspectRatio = useMemo(() => {
    const config = ASPECT_RATIOS.find((r) => r.id === settings.aspectRatio)
    return config?.ratio ?? 16 / 9
  }, [settings.aspectRatio])

  useImperativeHandle(ref, () => ({
    getThumbnailBlob: async () => {
      if (!svgRef.current || !dimensions.width || !dimensions.height) return null
      try {
        return await svgToPngBlob(svgRef.current, dimensions.width, dimensions.height)
      } catch (err) {
        console.error('Failed to generate thumbnail', err)
        return null
      }
    }
  }))

  useEffect(() => {
    if (!wrapperRef.current) return
    const element = wrapperRef.current
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== element) continue
        const { width } = entry.contentRect
        const nextWidth = Math.floor(width)
        const nextHeight = Math.floor(width / aspectRatio)

        setDimensions((prev) => {
          if (prev.width === nextWidth && prev.height === nextHeight) {
            return prev
          }
          return { width: nextWidth, height: nextHeight }
        })
      }
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [aspectRatio])

  const { layoutWords, isCalculating } = useWordLayout(
    words,
    Math.max(dimensions.width, 1),
    Math.max(dimensions.height, 1),
    settings,
    viewMode,
  )

  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    const t = transition().duration(700)
    const wordsSelection = svg
      .selectAll<SVGGElement, LayoutWord>('g.word')
      .data(layoutWords, (d) => d?.text ?? '')

    wordsSelection
      .exit()
      .transition(t)
      .style('opacity', 0)
      .remove()

    const enter = wordsSelection
      .enter()
      .append('g')
      .attr('class', 'word')
      .style('opacity', 0)
      .attr('transform', `translate(${dimensions.width / 2}, ${dimensions.height / 2})`)

    enter.append('circle').attr('r', 0).attr('opacity', 0)
    enter.append('rect').attr('class', 'word-bbox')
    enter
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')

    const merged = enter.merge(wordsSelection as any)

    merged
      .transition(t)
      .style('opacity', 1)
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)

    merged
      .select<SVGTextElement>('text')
      .text((d: LayoutWord) => d.text)
      .transition(t)
      .attr('fill', (d: LayoutWord) => d.color)
      .attr('font-size', (d: LayoutWord) => d.fontSize)
      .attr('transform', (d: LayoutWord) => `rotate(${d.rotate})`)

    merged
      .select<SVGRectElement>('rect')
      .attr('width', (d: LayoutWord) => d.width ?? d.fontSize)
      .attr('height', (d: LayoutWord) => d.height ?? d.fontSize)
      .attr('x', (d: LayoutWord) => -((d.width ?? d.fontSize) / 2))
      .attr('y', (d: LayoutWord) => -((d.height ?? d.fontSize) / 2))
      .attr('fill', 'rgba(59, 130, 246, 0.12)')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 0.8)
      .attr('pointer-events', 'none')
      .attr('opacity', showBoundingBoxes ? 0.8 : 0)

    merged
      .select<SVGCircleElement>('circle')
      .transition(t)
      .attr('r', (d: LayoutWord) => (viewMode === 'bubble' ? d.radius : 0))
      .attr('fill', (d: LayoutWord) => d.color)
      .attr('opacity', viewMode === 'bubble' ? 0.15 : 0)
  }, [layoutWords, viewMode, dimensions.height, dimensions.width, showBoundingBoxes])

  const placeholderMessage = useMemo(() => {
    if (statusMessage) return statusMessage
    if (!words.length && !isCalculating) {
      return '抽出できる単語が見つかりません。設定を確認してください。'
    }
    return null
  }, [statusMessage, words.length, isCalculating])

  const handleDownloadSvg = () => {
    if (!svgRef.current || !layoutWords.length) return

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svgRef.current)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'word-cloud.svg'
    link.click()

    URL.revokeObjectURL(url)
  }

  const handleDownloadPng = async () => {
    if (!svgRef.current || !layoutWords.length || !dimensions.width || !dimensions.height) return

    try {
      const blob = await svgToPngBlob(svgRef.current, dimensions.width, dimensions.height)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'word-cloud.png'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
      alert('画像の生成に失敗しました。')
    }
  }

  const handleDownloadCsv = () => {
    if (!words.length) return

    // Create CSV content
    const csvContent = [
      'word,frequency,pos',
      ...words.map((w) => `"${w.text}",${w.value},"${w.pos ?? ''}"`),
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'word-cloud-data.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="preview-panel">
      <header className="preview-header">
        <p className="preview-meta">
          表示語数: <strong>{layoutWords.length}</strong>
        </p>
        <div className="download-buttons">
          <select
            className="view-mode-select"
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value as ViewMode)}
          >
            <option value="cloud">Word Cloud</option>
            <option value="bubble">Word Bubble</option>
          </select>
          <select
            className="color-scheme-select"
            value={settings.colorSchemeId}
            onChange={(e) => onColorSchemeChange(e.target.value)}
          >
            {COLOR_SCHEMES.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.label}
              </option>
            ))}
          </select>
          <select
            className="color-rule-select"
            value={settings.colorRule}
            onChange={(e) => onColorRuleChange(e.target.value as WordCloudSettings['colorRule'])}
          >
            <option value="frequency">頻度ベース</option>
            <option value="pos">品詞ベース</option>
            <option value="scheme">単語ベース</option>
          </select>
          <select
            className="aspect-ratio-select"
            value={settings.aspectRatio}
            onChange={(e) => onAspectRatioChange(e.target.value as AspectRatio)}
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio.id} value={ratio.id}>
                {ratio.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleDownloadSvg} disabled={!layoutWords.length}>
            SVG
          </button>
          <button type="button" onClick={handleDownloadPng} disabled={!layoutWords.length}>
            PNG
          </button>
          <button type="button" onClick={handleDownloadCsv} disabled={!words.length}>
            CSV
          </button>
        </div>
      </header>

      <div
        className="preview-canvas-wrapper"
        ref={wrapperRef}
        style={{
          aspectRatio: `${aspectRatio}`,
          height: 'auto', // Let aspect-ratio control the height
        }}
      >
        <svg
          ref={svgRef}
          className="preview-canvas"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          role="img"
          aria-label="日本語ワードクラウド"
        />

        {isCalculating && (
          <div className="preview-message">レイアウトを計算しています...</div>
        )}

        {!isCalculating && placeholderMessage && (
          <div className="preview-message">{placeholderMessage}</div>
        )}
      </div>
    </section>
  )
})
