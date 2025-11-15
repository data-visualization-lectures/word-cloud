import { useEffect, useMemo, useRef, useState } from 'react'
import { select } from 'd3-selection'
import { transition } from 'd3-transition'
import type { ViewMode, WordCloudSettings, WordFrequency } from '../types'
import { useWordLayout, type LayoutWord } from '../hooks/useWordLayout'

interface WordCloudPreviewProps {
  words: WordFrequency[]
  settings: WordCloudSettings
  statusMessage: string | null
  viewMode: ViewMode
}

const DEFAULT_RATIO = 5 / 3

export const WordCloudPreview = ({
  words,
  settings,
  statusMessage,
  viewMode,
}: WordCloudPreviewProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!wrapperRef.current) return
    const element = wrapperRef.current
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== element) continue
        const { width } = entry.contentRect
        const nextWidth = Math.floor(width)
        const nextHeight = Math.floor(width / DEFAULT_RATIO)

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
  }, [])

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

    enter.append('circle').attr('r', 0).attr('opacity', 0)
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
      .select<SVGCircleElement>('circle')
      .transition(t)
      .attr('r', (d: LayoutWord) => (viewMode === 'bubble' ? d.radius : 0))
      .attr('fill', (d: LayoutWord) => d.color)
      .attr('opacity', viewMode === 'bubble' ? 0.15 : 0)
  }, [layoutWords, viewMode])

  const placeholderMessage = useMemo(() => {
    if (statusMessage) return statusMessage
    if (!words.length && !isCalculating) {
      return '抽出できる単語が見つかりません。設定を確認してください。'
    }
    return null
  }, [statusMessage, words.length, isCalculating])

  const handleDownload = () => {
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

  return (
    <section className="preview-panel">
      <header className="preview-header">
        <div>
          <h2>プレビュー</h2>
          <p className="preview-meta">
            表示語数: <strong>{layoutWords.length}</strong>
          </p>
        </div>
        <button type="button" onClick={handleDownload} disabled={!layoutWords.length}>
          SVGダウンロード
        </button>
      </header>

      <div className="preview-canvas-wrapper" ref={wrapperRef}>
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
}
