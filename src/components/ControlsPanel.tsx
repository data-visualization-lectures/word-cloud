import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import noUiSlider, { type API as NoUiSliderInstance, PipsMode } from 'nouislider'
import { COLOR_SCHEMES } from '../constants/colors'
import type { WordCloudSettings } from '../types'

interface ControlsPanelProps {
  text: string
  onTextChange: (value: string) => void
  stopwordsText: string
  onStopwordsChange: (value: string) => void
  settings: WordCloudSettings
  onSettingsChange: (patch: Partial<WordCloudSettings>) => void
  tokenCount: number
  onGenerate: () => void
  showBoundingBoxes: boolean
  onShowBoundingBoxesChange: (value: boolean) => void
}

const FONT_MIN_LIMIT = 10
const FONT_MAX_LIMIT = 160
const MAX_WORDS_MIN = 20
const MAX_WORDS_MAX = 400
const MAX_WORDS_STEP = 10
const PADDING_MIN = 0
const PADDING_MAX = 20
const ROTATION_PRESETS = [
  { id: 'none', label: '回転なし', angles: [0] },
  { id: 'light', label: '軽め（-30°〜30°）', angles: [-30, -15, 0, 15, 30] },
  { id: 'wide', label: 'ランダム（-60°〜60°）', angles: [-60, -30, 0, 30, 60] },
]
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const arraysEqual = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

export const ControlsPanel = ({
  text,
  onTextChange,
  stopwordsText,
  onStopwordsChange,
  settings,
  onSettingsChange,
  tokenCount,
  onGenerate,
  showBoundingBoxes,
  onShowBoundingBoxesChange,
}: ControlsPanelProps) => {
  const [isTextPanelOpen, setIsTextPanelOpen] = useState(true)
  const [isStopwordsPanelOpen, setIsStopwordsPanelOpen] = useState(false)
  const [maxWordsInput, setMaxWordsInput] = useState(String(settings.maxWords))
  const [maxWordsError, setMaxWordsError] = useState<string | null>(null)
  const maxWordsSliderRef = useRef<HTMLDivElement | null>(null)
  const maxWordsSliderInstance = useRef<NoUiSliderInstance | null>(null)
  const paddingSliderRef = useRef<HTMLDivElement | null>(null)
  const paddingSliderInstance = useRef<NoUiSliderInstance | null>(null)
  const fontSizeSliderRef = useRef<HTMLDivElement | null>(null)
  const fontSizeSliderInstance = useRef<NoUiSliderInstance | null>(null)

  const rotationPresetId =
    ROTATION_PRESETS.find((preset) => arraysEqual(preset.angles, settings.rotationAngles))?.id ??
    'custom'

  useEffect(() => {
    setMaxWordsInput(String(settings.maxWords))
    setMaxWordsError(null)
    if (maxWordsSliderInstance.current) {
      maxWordsSliderInstance.current.set(settings.maxWords)
    }
  }, [settings.maxWords])

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(event.target.value)
  }

  const handleStopwordsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onStopwordsChange(event.target.value)
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (typeof content === 'string') {
        onTextChange(content)
      }
    }
    reader.onerror = () => {
      alert('ファイルの読み込みに失敗しました。')
    }
    reader.readAsText(file, 'UTF-8')
    // Reset input so the same file can be uploaded again
    event.target.value = ''
  }

  const handleFontSizeChange = (index: 0 | 1, value: number) => {
    const nextRange: [number, number] = [...settings.fontSizeRange]
    if (index === 0) {
      nextRange[0] = Math.max(FONT_MIN_LIMIT, Math.min(value, nextRange[1] - 4))
    } else {
      nextRange[1] = Math.min(FONT_MAX_LIMIT, Math.max(value, nextRange[0] + 4))
    }
    onSettingsChange({ fontSizeRange: nextRange })
  }

  const handleGenerateClick = () => {
    setIsTextPanelOpen(false)
    onGenerate()
  }

  const handleMaxWordsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setMaxWordsInput(value)
    if (!value) {
      setMaxWordsError('値を入力してください。')
      return
    }
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) {
      setMaxWordsError('数値で入力してください。')
      return
    }
    if (numericValue < MAX_WORDS_MIN || numericValue > MAX_WORDS_MAX) {
      setMaxWordsError(`${MAX_WORDS_MIN}〜${MAX_WORDS_MAX}の範囲で入力してください。`)
      return
    }
    setMaxWordsError(null)
    onSettingsChange({ maxWords: numericValue })
  }

  const handleMaxWordsBlur = () => {
    if (!maxWordsInput) {
      setMaxWordsInput(String(settings.maxWords))
      setMaxWordsError(null)
      return
    }
    const numericValue = Number(maxWordsInput)
    const nextValue = clamp(
      Number.isNaN(numericValue) ? settings.maxWords : numericValue,
      MAX_WORDS_MIN,
      MAX_WORDS_MAX,
    )
    setMaxWordsInput(String(nextValue))
    setMaxWordsError(null)
    onSettingsChange({ maxWords: nextValue })
  }

  const initializeMaxWordsSlider = () => {
    if (!maxWordsSliderRef.current || maxWordsSliderInstance.current) return
    maxWordsSliderInstance.current = noUiSlider.create(maxWordsSliderRef.current, {
      start: settings.maxWords,
      range: { min: MAX_WORDS_MIN, max: MAX_WORDS_MAX },
      step: MAX_WORDS_STEP,
      connect: [true, false],
      tooltips: false,
      format: {
        to: (value: number) => Math.round(value).toString(),
        from: Number,
      },
      pips: { mode: PipsMode.Range, density: 3 },
    })
    maxWordsSliderInstance.current.on('slide', (values) => {
      const numericValue = Math.round(Number(values[0]))
      if (Number.isNaN(numericValue)) return
      setMaxWordsInput(String(numericValue))
      setMaxWordsError(null)
    })
    maxWordsSliderInstance.current.on('change', (values) => {
      const numericValue = Math.round(Number(values[0]))
      if (Number.isNaN(numericValue) || numericValue === settings.maxWords) return
      onSettingsChange({ maxWords: numericValue })
    })
  }

  useEffect(() => {
    initializeMaxWordsSlider()
    return () => {
      maxWordsSliderInstance.current?.destroy()
      maxWordsSliderInstance.current = null
    }
  }, [])

  const initializePaddingSlider = () => {
    if (!paddingSliderRef.current || paddingSliderInstance.current) return
    paddingSliderInstance.current = noUiSlider.create(paddingSliderRef.current, {
      start: settings.padding,
      range: { min: PADDING_MIN, max: PADDING_MAX },
      step: 1,
      connect: [true, false],
      tooltips: false,
      format: {
        to: (value: number) => Math.round(value).toString(),
        from: Number,
      },
      pips: { mode: PipsMode.Values, values: [0, 5, 10, 15, 20], density: 4 },
    })
    paddingSliderInstance.current.on('change', (values) => {
      const numericValue = Math.round(Number(values[0]))
      if (Number.isNaN(numericValue) || numericValue === settings.padding) return
      onSettingsChange({ padding: clamp(numericValue, PADDING_MIN, PADDING_MAX) })
    })
  }

  useEffect(() => {
    initializePaddingSlider()
    return () => {
      paddingSliderInstance.current?.destroy()
      paddingSliderInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (paddingSliderInstance.current) {
      paddingSliderInstance.current.set(settings.padding)
    }
  }, [settings.padding])

  const handlePaddingInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number(event.target.value)
    const safeValue = Number.isNaN(numericValue)
      ? settings.padding
      : clamp(numericValue, PADDING_MIN, PADDING_MAX)
    onSettingsChange({ padding: safeValue })
  }

  const initializeFontSizeSlider = () => {
    if (!fontSizeSliderRef.current || fontSizeSliderInstance.current) return
    fontSizeSliderInstance.current = noUiSlider.create(fontSizeSliderRef.current, {
      start: settings.fontSizeRange,
      range: { min: FONT_MIN_LIMIT, max: FONT_MAX_LIMIT },
      margin: 4,
      step: 1,
      connect: [false, true, false],
      behaviour: 'drag',
      tooltips: false,
      format: {
        to: (value: number) => Math.round(value).toString(),
        from: Number,
      },
      pips: { mode: PipsMode.Range, density: 4 },
    })
    fontSizeSliderInstance.current.on('change', (values) => {
      const [minValue, maxValue] = values.map((value) => Math.round(Number(value)))
      if (
        Number.isNaN(minValue) ||
        Number.isNaN(maxValue) ||
        (minValue === settings.fontSizeRange[0] && maxValue === settings.fontSizeRange[1])
      ) {
        return
      }
      onSettingsChange({ fontSizeRange: [minValue, maxValue] })
    })
  }

  useEffect(() => {
    initializeFontSizeSlider()
    return () => {
      fontSizeSliderInstance.current?.destroy()
      fontSizeSliderInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (fontSizeSliderInstance.current) {
      const [minSize, maxSize] = settings.fontSizeRange
      fontSizeSliderInstance.current.set([minSize, maxSize])
    }
  }, [settings.fontSizeRange])

  return (
    <section className="controls-panel">
      <h1>Japanese Word Cloud</h1>
      <p className="panel-description">
        テキストを貼り付けて、SVGとして使える日本語ワードクラウドを生成します。
      </p>

      <div className="form-section text-input-section">
        <div className="field-label-row">
          <label className="field-label" htmlFor="text-input">
            テキスト入力
          </label>
          <button
            type="button"
            className="accordion-toggle"
            aria-expanded={isTextPanelOpen}
            aria-controls="text-accordion-panel"
            onClick={() => setIsTextPanelOpen((prev) => !prev)}
          >
            {isTextPanelOpen ? 'ー' : '＋'}
          </button>
        </div>
        {isTextPanelOpen && (
          <div id="text-accordion-panel" className="accordion-panel">
            <div style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="file-upload" className="file-upload-label">
                📁 ファイルを選択
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
            <textarea
              id="text-input"
              className="textarea"
              value={text}
              onChange={handleTextareaChange}
              placeholder="文章を入力してください"
              rows={10}
            />
            <div className="input-actions">
              <p className="field-hint">
                語数: <strong>{tokenCount}</strong>
              </p>
              <button type="button" className="generate-button" onClick={handleGenerateClick}>
                生成する
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="field-label-row">
          <label className="field-label" htmlFor="stopwords">
            ストップワード
          </label>
          <button
            type="button"
            className="accordion-toggle"
            aria-expanded={isStopwordsPanelOpen}
            aria-controls="stopwords-accordion-panel"
            onClick={() => setIsStopwordsPanelOpen((prev) => !prev)}
          >
            {isStopwordsPanelOpen ? 'ー' : '＋'}
          </button>
        </div>
        {isStopwordsPanelOpen && (
          <div id="stopwords-accordion-panel" className="accordion-panel">
            <textarea
              id="stopwords"
              className="textarea small"
              value={stopwordsText}
              onChange={handleStopwordsChange}
              rows={8}
            />
            <p className="field-hint">改行またはカンマ区切りで入力。正規化して比較します。</p>
          </div>
        )}
      </div>

      <div className="form-grid">
        <label className="field-label" htmlFor="max-words">
          最大語数
        </label>
        <div className="input-with-slider">
          <div className="nouislider-control" ref={maxWordsSliderRef} />
          <input
            type="number"
            id="max-words"
            min={MAX_WORDS_MIN}
            max={MAX_WORDS_MAX}
            value={maxWordsInput}
            onChange={handleMaxWordsChange}
            onBlur={handleMaxWordsBlur}
          />
        </div>
        <p className={`field-hint ${maxWordsError ? 'error' : ''}`}>
          {maxWordsError ?? `${MAX_WORDS_MIN}〜${MAX_WORDS_MAX}語の範囲で調整できます（${MAX_WORDS_STEP}語刻み）。`}
        </p>

        <label className="field-label">フォントサイズ</label>
        <div className="input-with-slider">
          <div className="nouislider-control" ref={fontSizeSliderRef} />
        </div>
        <div className="range-inputs">
          <input
            type="number"
            min={FONT_MIN_LIMIT}
            max={Math.max(FONT_MIN_LIMIT, settings.fontSizeRange[1] - 4)}
            value={settings.fontSizeRange[0]}
            onChange={(event) => handleFontSizeChange(0, Number(event.target.value))}
          />
          <span className="range-separator">〜</span>
          <input
            type="number"
            min={Math.min(FONT_MAX_LIMIT, settings.fontSizeRange[0] + 4)}
            max={FONT_MAX_LIMIT}
            value={settings.fontSizeRange[1]}
            onChange={(event) => handleFontSizeChange(1, Number(event.target.value))}
          />
        </div>
        <p className="field-hint">
          {FONT_MIN_LIMIT}〜{FONT_MAX_LIMIT}pt のあいだで、最小と最大は 4pt 以上離す必要があります。
        </p>

        <label className="field-label" htmlFor="color-scheme">
          カラースキーム
        </label>
        <select
          id="color-scheme"
          value={settings.colorSchemeId}
          onChange={(event) => onSettingsChange({ colorSchemeId: event.target.value })}
        >
          {COLOR_SCHEMES.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.label}
            </option>
          ))}
        </select>


        <label className="field-label" htmlFor="debug-bounding-boxes">
          デバッグ表示
        </label>
        <label className="checkbox-field">
          <input
            id="debug-bounding-boxes"
            type="checkbox"
            checked={showBoundingBoxes}
            onChange={(event) => onShowBoundingBoxesChange(event.target.checked)}
          />
          バウンディングボックス
        </label>



        <label className="field-label" htmlFor="spiral">
          レイアウト
        </label>
        <select
          id="spiral"
          value={settings.spiral}
          onChange={(event) =>
            onSettingsChange({ spiral: event.target.value as WordCloudSettings['spiral'] })
          }
        >
          <option value="archimedean">アーキメディアン</option>
          <option value="rectangular">矩形</option>
        </select>

        <label className="field-label" htmlFor="rotation">
          回転
        </label>
        <select
          id="rotation"
          value={rotationPresetId}
          onChange={(event) => {
            const preset = ROTATION_PRESETS.find(({ id }) => id === event.target.value)
            if (preset) {
              onSettingsChange({ rotationAngles: preset.angles })
            }
          }}
        >
          {ROTATION_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="padding">
          単語間隔
        </label>
        <div className="input-with-slider">
          <div className="nouislider-control" ref={paddingSliderRef} />
          <input
            type="number"
            id="padding"
            min={PADDING_MIN}
            max={PADDING_MAX}
            value={settings.padding}
            onChange={handlePaddingInputChange}
          />
        </div>
        <p className="field-hint">
          {PADDING_MIN}〜{PADDING_MAX}px の範囲でスライダーまたは直接入力できます。
        </p>
      </div>


    </section>
  )
}
