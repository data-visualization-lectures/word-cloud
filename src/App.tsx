import { useMemo, useState } from 'react'
import './App.css'
import { ControlsPanel } from './components/ControlsPanel'
import { WordCloudPreview } from './components/WordCloudPreview'
import { DEFAULT_COLOR_SCHEME_ID } from './constants/colors'
import { DEFAULT_JA_STOPWORDS, SAMPLE_TEXT } from './constants/stopwords'
import { computeWordFrequencies, parseStopwords } from './lib/textProcessing'
import type { WordCloudSettings } from './types'

const defaultStopwords = DEFAULT_JA_STOPWORDS.join('\n')

function App() {
  const [text, setText] = useState(SAMPLE_TEXT)
  const [stopwordsText, setStopwordsText] = useState(defaultStopwords)
  const [settings, setSettings] = useState<WordCloudSettings>({
    maxWords: 120,
    fontSizeRange: [18, 78],
    spiral: 'archimedean',
    padding: 2,
    rotationAngles: [-60, -30, 0, 30, 60],
    colorSchemeId: DEFAULT_COLOR_SCHEME_ID,
  })

  const stopwordsSet = useMemo(() => {
    const parsed = parseStopwords(stopwordsText)
    return new Set(parsed)
  }, [stopwordsText])

  const wordFrequencies = useMemo(() => {
    return computeWordFrequencies({
      text,
      stopwords: stopwordsSet,
      maxWords: settings.maxWords,
    })
  }, [text, stopwordsSet, settings.maxWords])

  const handleSettingsChange = (patch: Partial<WordCloudSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  const previewStatus = (() => {
    if (!text.trim()) return 'テキストを入力してください。'
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
        />
        <WordCloudPreview words={wordFrequencies} settings={settings} statusMessage={previewStatus} />
      </main>
    </div>
  )
}

export default App
