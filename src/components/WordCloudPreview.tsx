import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { select } from 'd3-selection'
import { transition } from 'd3-transition'
import type { ViewMode, WordCloudSettings, WordFrequency } from '../types'
import { useWordLayout, type LayoutWord } from '../hooks/useWordLayout'
import { ASPECT_RATIOS } from '../constants/aspectRatios'
import { CANVAS_BACKGROUND_COLORS, getColorScheme } from '../constants/colors'
import { getFontOption } from '../constants/fonts'
import { downloadFileName, visualizationToPngBlob } from '../lib/image-utils'
import { POS_LEGEND_ITEMS } from '../lib/layout'
import { useI18n } from '../i18n'

export interface WordCloudPreviewHandle {
  getThumbnailBlob: () => Promise<Blob | null>
}

interface WordCloudPreviewProps {
  words: WordFrequency[]
  settings: WordCloudSettings
  statusMessage: string | null
  viewMode: ViewMode
  showBoundingBoxes: boolean
  projectName?: string
  onViewModeChange: (mode: ViewMode) => void
  onRelayout: () => void
  onExcludeWord: (text: string) => void
}

export const WordCloudPreview = forwardRef<WordCloudPreviewHandle, WordCloudPreviewProps>(({
  words,
  settings,
  statusMessage,
  viewMode,
  showBoundingBoxes,
  projectName,
  onViewModeChange,
  onRelayout,
  onExcludeWord,
}, ref) => {
  const { t } = useI18n()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [pngScale, setPngScale] = useState(2)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; word: LayoutWord } | null>(null)

  const aspectRatio = useMemo(() => {
    const config = ASPECT_RATIOS.find((ratio) => ratio.id === settings.aspectRatio)
    return config?.ratio ?? 16 / 9
  }, [settings.aspectRatio])

  const font = getFontOption(settings.fontFamilyId)
  const backgroundColor = CANVAS_BACKGROUND_COLORS[settings.canvasBackground]
  const total = useMemo(() => words.reduce((sum, word) => sum + word.value, 0), [words])

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
          if (prev.width === nextWidth && prev.height === nextHeight) return prev
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

  useImperativeHandle(ref, () => ({
    getThumbnailBlob: async () => {
      if (!layoutWords.length || !dimensions.width || !dimensions.height) return null
      try {
        return await visualizationToPngBlob({
          layoutWords,
          width: dimensions.width,
          height: dimensions.height,
          settings,
          viewMode,
          scale: 1,
          backgroundColor: backgroundColor ?? '#ffffff',
        })
      } catch (err) {
        console.error('Failed to generate thumbnail', err)
        return null
      }
    },
  }), [layoutWords, dimensions, settings, viewMode, backgroundColor])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    svg.attr('font-family', font.cssStack)

    let bg = svg.select<SVGRectElement>('rect.canvas-bg')
    if (bg.empty()) {
      bg = svg.insert('rect', ':first-child').attr('class', 'canvas-bg')
    }
    bg.attr('x', 0)
      .attr('y', 0)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', backgroundColor ?? 'none')

    const titleFill = settings.canvasBackground === 'dark' ? '#f8fafc' : '#0f172a'
    const sourceFill = settings.canvasBackground === 'dark' ? '#94a3b8' : '#64748b'

    let title = svg.select<SVGTextElement>('text.chart-title')
    if (title.empty()) title = svg.append('text').attr('class', 'chart-title')
    title
      .attr('x', 16)
      .attr('y', 26)
      .attr('fill', titleFill)
      .attr('font-size', 18)
      .attr('font-weight', 700)
      .attr('font-family', font.cssStack)
      .text(settings.chartTitle.trim())

    let source = svg.select<SVGTextElement>('text.chart-source')
    if (source.empty()) source = svg.append('text').attr('class', 'chart-source')
    source
      .attr('x', Math.max(dimensions.width - 16, 16))
      .attr('y', Math.max(dimensions.height - 12, 20))
      .attr('text-anchor', 'end')
      .attr('fill', sourceFill)
      .attr('font-size', 12)
      .attr('font-weight', 500)
      .attr('font-family', font.cssStack)
      .text(settings.chartSource.trim())

    const anim = transition().duration(500)
    const wordsSelection = svg
      .selectAll<SVGGElement, LayoutWord>('g.word')
      .data(layoutWords, (d) => d?.text ?? '')

    wordsSelection.exit().transition(anim).style('opacity', 0).remove()

    const enter = wordsSelection
      .enter()
      .append('g')
      .attr('class', 'word')
      .style('opacity', 0)
      .style('cursor', 'pointer')
      .attr('transform', `translate(${dimensions.width / 2}, ${dimensions.height / 2})`)

    enter.append('circle').attr('r', 0).attr('opacity', 0)
    enter.append('rect').attr('class', 'word-bbox')
    enter.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')

    const merged = enter.merge(wordsSelection)

    merged
      .on('mouseenter', (event: MouseEvent, d: LayoutWord) => {
        const bounds = wrapperRef.current?.getBoundingClientRect()
        if (!bounds) return
        setTooltip({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
          word: d,
        })
      })
      .on('mousemove', (event: MouseEvent, d: LayoutWord) => {
        const bounds = wrapperRef.current?.getBoundingClientRect()
        if (!bounds) return
        setTooltip({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
          word: d,
        })
      })
      .on('mouseleave', () => setTooltip(null))
      .on('click', (_event: MouseEvent, d: LayoutWord) => {
        onExcludeWord(d.text)
        setTooltip(null)
      })

    merged
      .transition(anim)
      .style('opacity', 1)
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)

    merged
      .select<SVGCircleElement>('circle')
      .transition(anim)
      .attr('r', (d: LayoutWord) => (viewMode === 'bubble' ? d.radius : 0))
      .attr('fill', (d: LayoutWord) => d.color)
      .attr('opacity', viewMode === 'bubble' ? 1 : 0)

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
      .select<SVGTextElement>('text')
      .text((d: LayoutWord) => (d.showLabel ? d.text : ''))
      .attr('font-family', font.cssStack)
      .transition(anim)
      .attr('fill', (d: LayoutWord) => (viewMode === 'bubble' ? (d.textColor ?? '#0f172a') : d.color))
      .attr('font-size', (d: LayoutWord) => d.fontSize)
      .attr('font-weight', (d: LayoutWord) => d.fontWeight)
      .attr('transform', (d: LayoutWord) => `rotate(${d.rotate})`)
  }, [
    layoutWords,
    viewMode,
    dimensions.height,
    dimensions.width,
    showBoundingBoxes,
    font.cssStack,
    backgroundColor,
    settings.canvasBackground,
    settings.chartTitle,
    settings.chartSource,
    onExcludeWord,
  ])

  const placeholderMessage = useMemo(() => {
    if (statusMessage) return statusMessage
    if (!words.length && !isCalculating) return t('preview.noWordsDetail')
    return null
  }, [statusMessage, words.length, isCalculating, t])

  const handleDownloadSvg = () => {
    if (!svgRef.current || !layoutWords.length) return
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('font-family', font.cssStack)
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(clone)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadFileName('word-cloud', 'svg', projectName)
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPng = async () => {
    if (!layoutWords.length || !dimensions.width || !dimensions.height) return
    try {
      const blob = await visualizationToPngBlob({
        layoutWords,
        width: dimensions.width,
        height: dimensions.height,
        settings,
        viewMode,
        scale: pngScale,
        backgroundColor: backgroundColor ?? (settings.canvasBackground === 'transparent' ? null : '#ffffff'),
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = downloadFileName('word-cloud', 'png', projectName)
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
      alert(t('preview.downloadFailed'))
    }
  }

  const handleDownloadCsv = () => {
    if (!words.length) return
    const csvContent = [
      'word,frequency,pos',
      ...words.map((word) => `"${word.text.replace(/"/g, '""')}",${word.value},"${word.pos ?? ''}"`),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadFileName('word-cloud-data', 'csv', projectName)
    link.click()
    URL.revokeObjectURL(url)
  }

  const scheme = getColorScheme(settings.colorSchemeId)
  const posColors: Record<string, string> = {
    名詞: scheme.colors[0],
    動詞: scheme.colors[1] ?? scheme.colors[0],
    形容詞: scheme.colors[2] ?? scheme.colors[0],
    副詞: scheme.colors[3] ?? scheme.colors[0],
  }

  return (
    <section className="preview-panel">
      <header className="preview-header">
        <p className="preview-meta">
          {t('preview.wordCount')}: <strong>{layoutWords.length}</strong>
          {layoutWords.length > 0 && <span className="preview-hint">{t('preview.clickToExclude')}</span>}
        </p>
        <div className="download-buttons">
          <select
            className="view-mode-select"
            value={viewMode}
            onChange={(event) => onViewModeChange(event.target.value as ViewMode)}
          >
            <option value="cloud">{t('preview.viewCloud')}</option>
            <option value="bubble">{t('preview.viewBubble')}</option>
          </select>
          <button type="button" className="button-secondary compact-button" onClick={onRelayout} disabled={!layoutWords.length}>
            {t('preview.relayout')}
          </button>
          <label className="png-scale">
            {t('preview.pngScale')}
            <select value={pngScale} onChange={(event) => setPngScale(Number(event.target.value))}>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          </label>
          <button type="button" onClick={handleDownloadSvg} disabled={!layoutWords.length}>SVG</button>
          <button type="button" onClick={handleDownloadPng} disabled={!layoutWords.length}>PNG</button>
          <button type="button" onClick={handleDownloadCsv} disabled={!words.length}>CSV</button>
        </div>
      </header>

      <div
        className={`preview-canvas-wrapper canvas-${settings.canvasBackground}`}
        ref={wrapperRef}
        style={{ aspectRatio: `${aspectRatio}`, height: 'auto' }}
      >
        <svg
          ref={svgRef}
          className="preview-canvas"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          role="img"
          aria-label={t('preview.ariaLabel')}
        />
        {isCalculating && <div className="preview-message">{t('preview.calculating')}</div>}
        {!isCalculating && placeholderMessage && (
          <div className="preview-message">{placeholderMessage}</div>
        )}
        {tooltip && (
          <div
            className="word-tooltip"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <strong>{tooltip.word.text}</strong>
            <span>{tooltip.word.value}（{total ? ((tooltip.word.value / total) * 100).toFixed(1) : 0}%）</span>
            {tooltip.word.pos && <span>{tooltip.word.pos}</span>}
          </div>
        )}
      </div>

      {settings.colorRule === 'pos' && layoutWords.length > 0 && (
        <ul className="pos-legend">
          {POS_LEGEND_ITEMS.map((item) => (
            <li key={item.pos}>
              <span className="pos-swatch" style={{ background: posColors[item.pos] }} />
              {t(item.labelKey)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
})

WordCloudPreview.displayName = 'WordCloudPreview'
