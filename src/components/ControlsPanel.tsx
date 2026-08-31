import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import noUiSlider, { type API as NoUiSliderInstance, PipsMode } from 'nouislider'
import type { InputMode, PosType, StylePresetId, WordCloudSettings, WordFrequency } from '../types'
import { POS_OPTIONS } from '../types'
import { COLOR_SCHEMES } from '../constants/colors'
import { ASPECT_RATIOS } from '../constants/aspectRatios'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n'
import { WordListPanel } from './WordListPanel'
import { looksLikeFrequencyTable } from '../lib/textProcessing'

interface ControlsPanelProps {
  text: string
  onTextChange: (value: string) => void
  stopwordsText: string
  onStopwordsChange: (value: string) => void
  settings: WordCloudSettings
  onSettingsChange: (patch: Partial<WordCloudSettings>) => void
  onApplyPreset: (presetId: StylePresetId) => void
  tokenCount: number
  words: WordFrequency[]
  inputMode: InputMode
  onInputModeChange: (mode: InputMode) => void
  onGenerate: () => void
  hasGenerated: boolean
  showBoundingBoxes: boolean
  onShowBoundingBoxesChange: (value: boolean) => void
  onExcludeWord: (text: string) => void
  onMergeWords: (texts: string[]) => void
}

const FONT_MIN_LIMIT = 10
const FONT_MAX_LIMIT = 160
const MAX_WORDS_MIN = 20
const MAX_WORDS_MAX = 400
const MAX_WORDS_STEP = 10
const PADDING_MIN = 0
const PADDING_MAX = 20

const ROTATION_PRESETS: { id: string; labelKey: TranslationKey; angles: number[] }[] = [
  { id: 'none', labelKey: 'controls.rotationNone', angles: [0] },
  { id: 'orthogonal', labelKey: 'controls.rotationOrthogonal', angles: [0, 90] },
  { id: 'light', labelKey: 'controls.rotationLight', angles: [-30, -15, 0, 15, 30] },
  { id: 'wide', labelKey: 'controls.rotationWide', angles: [-60, -30, 0, 30, 60] },
]

const POS_LABELS: Record<PosType, TranslationKey> = {
  名詞: 'controls.posNoun',
  動詞: 'controls.posVerb',
  形容詞: 'controls.posAdj',
  副詞: 'controls.posAdv',
}

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
  onApplyPreset,
  tokenCount,
  words,
  inputMode,
  onInputModeChange,
  onGenerate,
  hasGenerated,
  showBoundingBoxes,
  onShowBoundingBoxesChange,
  onExcludeWord,
  onMergeWords,
}: ControlsPanelProps) => {
  const { t } = useI18n()
  const [isTextPanelOpen, setIsTextPanelOpen] = useState(!hasGenerated)
  const [isWordListOpen, setIsWordListOpen] = useState(hasGenerated)
  const [isStopwordsPanelOpen, setIsStopwordsPanelOpen] = useState(false)
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [isStyleOpen, setIsStyleOpen] = useState(hasGenerated)
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false)
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
        if (file.name.endsWith('.csv') || looksLikeFrequencyTable(content)) {
          onInputModeChange('frequency')
        } else {
          onInputModeChange('text')
        }
      }
    }
    reader.onerror = () => {
      alert(t('controls.fileReadError'))
    }
    reader.readAsText(file, 'UTF-8')
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
    setIsWordListOpen(true)
    setIsStyleOpen(true)
    onGenerate()
  }

  const handleMaxWordsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setMaxWordsInput(value)
    if (!value) {
      setMaxWordsError(t('controls.enterValue'))
      return
    }
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) {
      setMaxWordsError(t('controls.enterNumber'))
      return
    }
    if (numericValue < MAX_WORDS_MIN || numericValue > MAX_WORDS_MAX) {
      setMaxWordsError(t('controls.maxWordsRange', { min: MAX_WORDS_MIN, max: MAX_WORDS_MAX }))
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

  const togglePos = (pos: PosType) => {
    const enabled = new Set(settings.enabledPos)
    if (enabled.has(pos)) {
      enabled.delete(pos)
    } else {
      enabled.add(pos)
    }
    if (enabled.size === 0) enabled.add('名詞')
    onSettingsChange({ enabledPos: POS_OPTIONS.filter((item) => enabled.has(item)) })
  }

  useEffect(() => {
    if (!isAdvancedSettingsOpen || !maxWordsSliderRef.current || maxWordsSliderInstance.current) return
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
    return () => {
      maxWordsSliderInstance.current?.destroy()
      maxWordsSliderInstance.current = null
    }
  }, [isAdvancedSettingsOpen])

  useEffect(() => {
    if (!isAdvancedSettingsOpen || !paddingSliderRef.current || paddingSliderInstance.current) return
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
    return () => {
      paddingSliderInstance.current?.destroy()
      paddingSliderInstance.current = null
    }
  }, [isAdvancedSettingsOpen])

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

  useEffect(() => {
    if (!isAdvancedSettingsOpen || !fontSizeSliderRef.current || fontSizeSliderInstance.current) return
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
        Number.isNaN(minValue)
        || Number.isNaN(maxValue)
        || (minValue === settings.fontSizeRange[0] && maxValue === settings.fontSizeRange[1])
      ) {
        return
      }
      onSettingsChange({ fontSizeRange: [minValue, maxValue] })
    })
    return () => {
      fontSizeSliderInstance.current?.destroy()
      fontSizeSliderInstance.current = null
    }
  }, [isAdvancedSettingsOpen])

  useEffect(() => {
    if (fontSizeSliderInstance.current) {
      const [minSize, maxSize] = settings.fontSizeRange
      fontSizeSliderInstance.current.set([minSize, maxSize])
    }
  }, [settings.fontSizeRange])

  const accordionButton = (
    expanded: boolean,
    onClick: () => void,
    controls: string,
  ) => (
    <button
      type="button"
      className="accordion-toggle"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
    >
      {expanded ? 'ー' : '＋'}
    </button>
  )

  return (
    <section className="controls-panel">
      <h1>Word Cloud</h1>
      <p className="panel-description">{t('controls.description')}</p>

      <div className="preset-row" role="group" aria-label={t('controls.preset')}>
        <button type="button" className="preset-button" onClick={() => onApplyPreset('report')}>
          {t('controls.presetReport')}
        </button>
        <button type="button" className="preset-button" onClick={() => onApplyPreset('presentation')}>
          {t('controls.presetPresentation')}
        </button>
        <button type="button" className="preset-button" onClick={() => onApplyPreset('dark')}>
          {t('controls.presetDark')}
        </button>
      </div>

      <div className="form-section text-input-section">
        <div className="field-label-row">
          <label className="field-label" htmlFor="text-input">{t('controls.textInput')}</label>
          {accordionButton(isTextPanelOpen, () => setIsTextPanelOpen((prev) => !prev), 'text-accordion-panel')}
        </div>
        {isTextPanelOpen && (
          <div id="text-accordion-panel" className="accordion-panel">
            <div className="segmented">
              <button
                type="button"
                className={inputMode === 'text' ? 'segmented-active' : ''}
                onClick={() => onInputModeChange('text')}
              >
                {t('controls.inputModeText')}
              </button>
              <button
                type="button"
                className={inputMode === 'frequency' ? 'segmented-active' : ''}
                onClick={() => onInputModeChange('frequency')}
              >
                {t('controls.inputModeCsv')}
              </button>
            </div>
            <div className="file-row">
              <label htmlFor="file-upload" className="file-upload-label">{t('controls.selectFile')}</label>
              <input
                id="file-upload"
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
            <textarea
              id="text-input"
              className="textarea"
              value={text}
              onChange={handleTextareaChange}
              placeholder={inputMode === 'frequency' ? t('controls.csvPlaceholder') : t('controls.placeholder')}
              rows={inputMode === 'frequency' ? 8 : 10}
            />
            {inputMode === 'frequency' && <p className="field-hint">{t('controls.csvHint')}</p>}
            <div className="input-actions">
              <p className="field-hint">
                {t('controls.wordCount')}: <strong>{tokenCount}</strong>
              </p>
              <button type="button" className="generate-button" onClick={handleGenerateClick}>
                {t('controls.generate')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="field-label-row">
          <span className="field-label">{t('controls.wordList')}</span>
          {accordionButton(isWordListOpen, () => setIsWordListOpen((prev) => !prev), 'word-list-panel')}
        </div>
        {isWordListOpen && (
          <div id="word-list-panel" className="accordion-panel">
            <WordListPanel words={words} onExclude={onExcludeWord} onMerge={onMergeWords} />
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="field-label-row">
          <span className="field-label">{t('controls.analysis')}</span>
          {accordionButton(isAnalysisOpen, () => setIsAnalysisOpen((prev) => !prev), 'analysis-panel')}
        </div>
        {isAnalysisOpen && (
          <div id="analysis-panel" className="accordion-panel form-grid">
            <span className="field-label">{t('controls.posFilter')}</span>
            <div className="chip-row">
              {POS_OPTIONS.map((pos) => (
                <label key={pos} className="chip">
                  <input
                    type="checkbox"
                    checked={settings.enabledPos.includes(pos)}
                    onChange={() => togglePos(pos)}
                  />
                  {t(POS_LABELS[pos])}
                </label>
              ))}
            </div>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={settings.excludeNoisePos}
                onChange={(event) => onSettingsChange({ excludeNoisePos: event.target.checked })}
              />
              {t('controls.excludeNoise')}
            </label>
            <p className="field-hint">{t('controls.excludeNoiseHint')}</p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={settings.compoundNouns}
                onChange={(event) => onSettingsChange({ compoundNouns: event.target.checked })}
              />
              {t('controls.compoundNouns')}
            </label>
            <label className="field-label" htmlFor="compound-max">{t('controls.compoundMax')}</label>
            <select
              id="compound-max"
              value={settings.compoundMaxLength}
              disabled={!settings.compoundNouns}
              onChange={(event) => onSettingsChange({ compoundMaxLength: Number(event.target.value) })}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
            <label className="field-label" htmlFor="token-form">{t('controls.tokenForm')}</label>
            <select
              id="token-form"
              value={settings.tokenForm}
              onChange={(event) => onSettingsChange({ tokenForm: event.target.value as WordCloudSettings['tokenForm'] })}
            >
              <option value="basic">{t('controls.tokenFormBasic')}</option>
              <option value="surface">{t('controls.tokenFormSurface')}</option>
            </select>
            <label className="field-label" htmlFor="min-frequency">{t('controls.minFrequency')}</label>
            <input
              id="min-frequency"
              type="number"
              min={1}
              max={50}
              value={settings.minFrequency}
              onChange={(event) => onSettingsChange({ minFrequency: clamp(Number(event.target.value) || 1, 1, 50) })}
            />
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="field-label-row">
          <span className="field-label">{t('controls.style')}</span>
          {accordionButton(isStyleOpen, () => setIsStyleOpen((prev) => !prev), 'style-panel')}
        </div>
        {isStyleOpen && (
          <div id="style-panel" className="accordion-panel form-grid">
            <label className="field-label" htmlFor="font-family">{t('controls.fontFamily')}</label>
            <select
              id="font-family"
              value={settings.fontFamilyId}
              onChange={(event) => onSettingsChange({ fontFamilyId: event.target.value as WordCloudSettings['fontFamilyId'] })}
            >
              <option value="sans">{t('controls.fontSans')}</option>
              <option value="serif">{t('controls.fontSerif')}</option>
              <option value="rounded">{t('controls.fontRounded')}</option>
            </select>
            <label className="field-label" htmlFor="font-weight">{t('controls.fontWeight')}</label>
            <select
              id="font-weight"
              value={settings.fontWeight}
              onChange={(event) => onSettingsChange({ fontWeight: Number(event.target.value) })}
            >
              <option value={500}>500</option>
              <option value={700}>700</option>
              <option value={800}>800</option>
              <option value={900}>900</option>
            </select>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={settings.weightByFrequency}
                onChange={(event) => onSettingsChange({ weightByFrequency: event.target.checked })}
              />
              {t('controls.weightByFrequency')}
            </label>
            <label className="field-label" htmlFor="color-scheme">{t('controls.colorScheme')}</label>
            <select
              id="color-scheme"
              value={settings.colorSchemeId}
              onChange={(event) => onSettingsChange({ colorSchemeId: event.target.value })}
            >
              {COLOR_SCHEMES.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>{t(scheme.labelKey)}</option>
              ))}
            </select>
            <label className="field-label" htmlFor="color-rule">{t('controls.colorRule')}</label>
            <select
              id="color-rule"
              value={settings.colorRule}
              onChange={(event) => onSettingsChange({ colorRule: event.target.value as WordCloudSettings['colorRule'] })}
            >
              <option value="frequency">{t('colorRule.frequency')}</option>
              <option value="pos">{t('colorRule.pos')}</option>
              <option value="scheme">{t('colorRule.scheme')}</option>
            </select>
            <label className="field-label" htmlFor="canvas-bg">{t('controls.canvasBackground')}</label>
            <select
              id="canvas-bg"
              value={settings.canvasBackground}
              onChange={(event) => onSettingsChange({ canvasBackground: event.target.value as WordCloudSettings['canvasBackground'] })}
            >
              <option value="white">{t('controls.bgWhite')}</option>
              <option value="dark">{t('controls.bgDark')}</option>
              <option value="transparent">{t('controls.bgTransparent')}</option>
            </select>
            <label className="field-label" htmlFor="aspect-ratio">{t('controls.aspectRatio')}</label>
            <select
              id="aspect-ratio"
              value={settings.aspectRatio}
              onChange={(event) => onSettingsChange({ aspectRatio: event.target.value as WordCloudSettings['aspectRatio'] })}
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio.id} value={ratio.id}>{t(ratio.labelKey)}</option>
              ))}
            </select>
            <label className="field-label" htmlFor="chart-title">{t('controls.chartTitle')}</label>
            <input
              id="chart-title"
              type="text"
              value={settings.chartTitle}
              placeholder={t('controls.titlePlaceholder')}
              onChange={(event) => onSettingsChange({ chartTitle: event.target.value })}
            />
            <label className="field-label" htmlFor="chart-source">{t('controls.chartSource')}</label>
            <input
              id="chart-source"
              type="text"
              value={settings.chartSource}
              placeholder={t('controls.titlePlaceholder')}
              onChange={(event) => onSettingsChange({ chartSource: event.target.value })}
            />
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="field-label-row">
          <label className="field-label" htmlFor="stopwords">{t('controls.stopwords')}</label>
          {accordionButton(isStopwordsPanelOpen, () => setIsStopwordsPanelOpen((prev) => !prev), 'stopwords-accordion-panel')}
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
            <p className="field-hint">{t('controls.stopwordsHint')}</p>
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="field-label-row">
          <span className="field-label">{t('controls.advancedSettings')}</span>
          {accordionButton(isAdvancedSettingsOpen, () => setIsAdvancedSettingsOpen((prev) => !prev), 'advanced-settings-panel')}
        </div>
        {isAdvancedSettingsOpen && (
          <div id="advanced-settings-panel" className="accordion-panel">
            <div className="form-grid">
              <label className="field-label" htmlFor="max-words">{t('controls.maxWords')}</label>
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
                {maxWordsError ?? t('controls.maxWordsHint', { min: MAX_WORDS_MIN, max: MAX_WORDS_MAX, step: MAX_WORDS_STEP })}
              </p>

              <label className="field-label">{t('controls.fontSize')}</label>
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
                <span className="range-separator">{t('controls.rangeSeparator')}</span>
                <input
                  type="number"
                  min={Math.min(FONT_MAX_LIMIT, settings.fontSizeRange[0] + 4)}
                  max={FONT_MAX_LIMIT}
                  value={settings.fontSizeRange[1]}
                  onChange={(event) => handleFontSizeChange(1, Number(event.target.value))}
                />
              </div>
              <p className="field-hint">
                {t('controls.fontSizeHint', { min: FONT_MIN_LIMIT, max: FONT_MAX_LIMIT })}
              </p>

              <label className="field-label" htmlFor="size-scale">{t('controls.sizeScale')}</label>
              <select
                id="size-scale"
                value={settings.sizeScale}
                onChange={(event) => onSettingsChange({ sizeScale: event.target.value as WordCloudSettings['sizeScale'] })}
              >
                <option value="linear">{t('controls.sizeScaleLinear')}</option>
                <option value="sqrt">{t('controls.sizeScaleSqrt')}</option>
                <option value="log">{t('controls.sizeScaleLog')}</option>
              </select>

              <label className="field-label" htmlFor="spiral">{t('controls.layout')}</label>
              <select
                id="spiral"
                value={settings.spiral}
                onChange={(event) => onSettingsChange({ spiral: event.target.value as WordCloudSettings['spiral'] })}
              >
                <option value="archimedean">{t('controls.archimedean')}</option>
                <option value="rectangular">{t('controls.rectangular')}</option>
              </select>

              <label className="field-label" htmlFor="rotation">{t('controls.rotation')}</label>
              <select
                id="rotation"
                value={rotationPresetId}
                onChange={(event) => {
                  const preset = ROTATION_PRESETS.find(({ id }) => id === event.target.value)
                  if (preset) onSettingsChange({ rotationAngles: preset.angles })
                }}
              >
                {ROTATION_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>{t(preset.labelKey)}</option>
                ))}
              </select>

              <label className="field-label" htmlFor="padding">{t('controls.wordSpacing')}</label>
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
                {t('controls.wordSpacingHint', { min: PADDING_MIN, max: PADDING_MAX })}
              </p>

              <label className="checkbox-field">
                <input
                  id="debug-bounding-boxes"
                  type="checkbox"
                  checked={showBoundingBoxes}
                  onChange={(event) => onShowBoundingBoxesChange(event.target.checked)}
                />
                {t('controls.boundingBoxes')}
              </label>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
