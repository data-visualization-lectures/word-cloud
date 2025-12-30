import { useMemo, useState, useRef } from 'react'
import './App.css'
import { ControlsPanel } from './components/ControlsPanel'
import { WordCloudPreview, type WordCloudPreviewHandle } from './components/WordCloudPreview'
import { SaveProjectModal } from './components/SaveProjectModal'
import { ProjectListModal } from './components/ProjectListModal'
import { useProject } from './hooks/useProject'
import { blobToBase64 } from './lib/image-utils'
import { DEFAULT_COLOR_SCHEME_ID } from './constants/colors'
import { DEFAULT_JA_STOPWORDS, SAMPLE_TEXT } from './constants/stopwords'
import { useKuromojiTokenizer } from './hooks/useKuromojiTokenizer'
import { computeWordFrequencies, parseStopwords } from './lib/textProcessing'
import type { ViewMode, WordCloudSettings, ProjectMeta } from './types'

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
    colorRule: 'frequency',
    aspectRatio: 'landscape',
  })

  // Project Management State
  const {
    currentProject,
    setCurrentProject,
    loadProject,
    createNewProject,
    updateCurrentProject
  } = useProject()

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false)
  const [thumbnailForSave, setThumbnailForSave] = useState<Blob | null>(null)

  const previewRef = useRef<WordCloudPreviewHandle>(null)

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

  // --- Project Actions ---


  const handleLoadProjectClick = () => {
    setIsLoadModalOpen(true)
  }

  const handleProjectSelect = async (project: ProjectMeta) => {
    try {
      const data = await loadProject(project.id)
      setText(data.text)
      setStopwordsText(data.stopwordsText)
      setSettings(data.settings)
      // Update metadata
      setCurrentProject(project)

      // Auto-generate to show the cloud
      setGeneratedInputs({
        text: data.text,
        stopwords: new Set(parseStopwords(data.stopwordsText)),
      })

      setIsLoadModalOpen(false)
    } catch (e) {
      console.error(e)
      alert('プロジェクトの読み込みに失敗しました')
    }
  }

  const handleSaveClick = async () => {
    if (!generatedInputs) {
      alert('保存する前にワードクラウドを生成してください。')
      return
    }

    try {
      const blob = await previewRef.current?.getThumbnailBlob() ?? null
      const base64 = blob ? await blobToBase64(blob) : undefined

      if (currentProject) {
        // Update existing project
        if (!confirm(`プロジェクト "${currentProject.name}" を上書き保存しますか？`)) return

        await updateCurrentProject({
          name: currentProject.name,
          data: { text, stopwordsText, settings },
          thumbnail: base64
        })
        alert('保存しました')
      } else {
        // Create new project
        setThumbnailForSave(blob)
        setIsSaveModalOpen(true)
      }
    } catch (e) {
      console.error(e)
      alert('保存処理中にエラーが発生しました。')
    }
  }

  const handleSaveModalSubmit = async (name: string) => {
    const base64 = thumbnailForSave ? await blobToBase64(thumbnailForSave) : undefined
    await createNewProject({
      name,
      app_name: 'word-cloud',
      data: { text, stopwordsText, settings },
      thumbnail: base64
    })
    alert('新規プロジェクトとして保存しました')
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
      <header className="app-header">
        <h1>Word Cloud</h1>
        <div className="header-actions">
          {currentProject && (
            <span className="current-project-name">
              編集中: <strong>{currentProject.name}</strong>
            </span>
          )}
          <button onClick={handleLoadProjectClick} className="button-secondary">サーバから読込</button>
          <button onClick={handleSaveClick}>
            {currentProject ? '上書き保存' : 'サーバに保存'}
          </button>
        </div>
      </header>

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
          ref={previewRef}
          words={wordFrequencies}
          settings={settings}
          statusMessage={previewStatus}
          viewMode={viewMode}
          showBoundingBoxes={showBoundingBoxes}
          onAspectRatioChange={(ratio) => handleSettingsChange({ aspectRatio: ratio })}
          onViewModeChange={setViewMode}
          onColorSchemeChange={(schemeId) => handleSettingsChange({ colorSchemeId: schemeId })}
          onColorRuleChange={(rule) => handleSettingsChange({ colorRule: rule })}
        />
      </main>

      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveModalSubmit}
        thumbnailBlob={thumbnailForSave}
      />

      <ProjectListModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onSelect={handleProjectSelect}
      />
    </div>
  )
}

export default App
