import { useMemo, useState } from 'react'
import './App.css'
import { ControlsPanel } from './components/ControlsPanel'
import { WordCloudPreview } from './components/WordCloudPreview'
import { DEFAULT_COLOR_SCHEME_ID } from './constants/colors'
import { DEFAULT_JA_STOPWORDS, SAMPLE_TEXT } from './constants/stopwords'
import { useKuromojiTokenizer } from './hooks/useKuromojiTokenizer'
import { computeWordFrequencies, parseStopwords } from './lib/textProcessing'
import type { ViewMode, WordCloudSettings } from './types'

const defaultStopwords = DEFAULT_JA_STOPWORDS.join('\n')

function App() {
  const [text, setText] = useState(SAMPLE_TEXT)
  const [stopwordsText, setStopwordsText] = useState(defaultStopwords)
  const [settings, setSettings] = useState<WordCloudSettings>({
    maxWords: 120,
    fontSizeRange: [18, 78],
    spiral: 'archimedean',
    padding: 2,
    rotationAngles: [0],
    colorSchemeId: DEFAULT_COLOR_SCHEME_ID,
    aspectRatio: 'landscape',
  })

  const { tokenizer, loading: tokenizerLoading, error: tokenizerError } = useKuromojiTokenizer()
  const [viewMode, setViewMode] = useState<ViewMode>('cloud')
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false)
  const [generatedInputs, setGeneratedInputs] = useState<{
    text: string
    stopwords: Set<string>
  } | null>(null)

  const stopwordsSet = useMemo(() => {
    const parsed = parseStopwords(stopwordsText)
    return new Set(parsed)
  }, [stopwordsText])

  const wordFrequencies = useMemo(() => {
    if (!generatedInputs) return []
    return computeWordFrequencies({
      text: generatedInputs.text,
      tokenizer,
      stopwords: generatedInputs.stopwords,
      maxWords: settings.maxWords,
    })
  }, [generatedInputs, tokenizer, settings.maxWords])

  const handleSettingsChange = (patch: Partial<WordCloudSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  const handleGenerate = () => {
    setGeneratedInputs({
      text,
      stopwords: new Set(stopwordsSet),
    })
  }

  const shouldRender = Boolean(generatedInputs)

  const previewStatus = (() => {
    if (tokenizerError) return tokenizerError
    if (tokenizerLoading && !tokenizer) return '形態素解析辞書を読み込み中です...'
    if (!shouldRender) return '生成ボタンを押してください。'
    if (!generatedInputs?.text.trim()) return 'テキストを入力してください。'
    if (!wordFrequencies.length) return '抽出できる単語が見つかりません。'
    return null
  })()

  return (
    <div className="app-shell">
      <main className="word-cloud-app">
        <ControlsPanel
          text={text}
          onTextChange={setText}
          stopwordsText={stopwordsText}
          onStopwordsChange={setStopwordsText}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          tokenCount={wordFrequencies.length}
          onGenerate={handleGenerate}
          showBoundingBoxes={showBoundingBoxes}
          onShowBoundingBoxesChange={setShowBoundingBoxes}
        />
        <WordCloudPreview
          words={wordFrequencies}
          settings={settings}
          statusMessage={previewStatus}
          viewMode={viewMode}
          showBoundingBoxes={showBoundingBoxes}
          onAspectRatioChange={(ratio) => handleSettingsChange({ aspectRatio: ratio })}
          onViewModeChange={setViewMode}
        />
      </main>
    </div>
  )
}

export default App
