import { useEffect, useMemo, useRef, useState } from 'react'
import type { WordCloudSettings, WordFrequency } from '../types'
import { useWordCloudLayout } from '../hooks/useWordCloudLayout'

interface WordCloudPreviewProps {
  words: WordFrequency[]
  settings: WordCloudSettings
  statusMessage: string | null
}

const DEFAULT_RATIO = 5 / 3

export const WordCloudPreview = ({ words, settings, statusMessage }: WordCloudPreviewProps) => {
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

  const { layoutWords, isCalculating } = useWordCloudLayout(
    words,
    Math.max(dimensions.width, 1),
    Math.max(dimensions.height, 1),
    settings,
  )

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
        {layoutWords.length > 0 && (
          <svg
            ref={svgRef}
            className="preview-canvas"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            role="img"
            aria-label="日本語ワードクラウド"
          >
            <g>
              {layoutWords.map((word) => (
                <text
                  key={`${word.text}-${word.x}-${word.y}`}
                  fontSize={word.fontSize}
                  fill={word.color}
                  textAnchor="middle"
                  transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                >
                  <title>
                    {word.text} ({word.value})
                  </title>
                  {word.text}
                </text>
              ))}
            </g>
          </svg>
        )}

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
