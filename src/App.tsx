import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { ControlsPanel } from './components/ControlsPanel'
import { WordCloudPreview, type WordCloudPreviewHandle } from './components/WordCloudPreview'
import { useProject } from './hooks/useProject'
import { blobToBase64 } from './lib/image-utils'
import { DEFAULT_COLOR_SCHEME_ID } from './constants/colors'
import { DEFAULT_JA_STOPWORDS } from './constants/stopwords'
import { useKuromojiTokenizer } from './hooks/useKuromojiTokenizer'
import { computeWordFrequencies, parseStopwords } from './lib/textProcessing'
import { useI18n } from './i18n'
import type { TranslationKey } from './i18n'
import type { ViewMode, WordCloudSettings } from './types'

const defaultStopwords = DEFAULT_JA_STOPWORDS.join('\n')

function App() {
  const { t } = useI18n()
  const [text, setText] = useState(t('sampleText'))
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
    loadProject
  } = useProject()

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string>('')

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

  // URLからのプロジェクト読み込み
  // 認証(window.datavizAuth)待ちと、tokenizerロード待ちが必要
  useMemo(() => {
    // URLからproject_idを取得
    const params = new URLSearchParams(window.location.search)
    const projectIdFromUrl = params.get('project_id')

    // まだ読み込み中でない、かつ tokenizer 準備OKなら
    if (projectIdFromUrl && !tokenizerLoading && !generatedInputs) {
      // ここで直接非同期コールできないので、別途useEffectで処理する
    }
  }, [tokenizerLoading, generatedInputs])

  // URLパラメータ起因のロード処理
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('project_id')

    if (!projectId) return
    if (currentProjectId && currentProjectId === projectId) return // すでにロード済み

    const tryLoad = async () => {
      // @ts-ignore
      const sb = window.datavizSupabase
      if (!sb) return false

      const { data } = await sb.auth.getSession()
      if (!data.session) return false

      try {
        const data = await loadProject(projectId)
        setText(data.text)
        setStopwordsText(data.stopwordsText)
        setSettings(data.settings)

        setCurrentProjectId(projectId)
        setCurrentProjectName('Loaded Project')

        setGeneratedInputs({
          text: data.text,
          stopwords: new Set(parseStopwords(data.stopwordsText)),
        })

        return true
      } catch (e) {
        console.error("Failed to load project from URL", e)
        return true
      }
    }

    const intervalId = setInterval(async () => {
      const done = await tryLoad()
      if (done) clearInterval(intervalId)
    }, 500)

    setTimeout(() => clearInterval(intervalId), 10000)

    return () => clearInterval(intervalId)

  }, [])


  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const header = document.querySelector('dataviz-tool-header')
    if (header && (header as any).showMessage) {
      (header as any).showMessage(message, type)
    } else {
      if (type === 'error') console.error(message)
      else console.log(message)
    }
  }

  const getProjectState = useCallback(() => {
    return { text, stopwordsText, settings }
  }, [text, stopwordsText, settings])

  const getThumbnailDataUri = useCallback(async () => {
    const blob = await previewRef.current?.getThumbnailBlob() ?? null
    if (!blob) return null
    return await blobToBase64(blob) as string
  }, [])

  const handleLoadProjectClick = useCallback(() => {
    const header = document.querySelector('dataviz-tool-header') as any
    if (header) {
      header.showLoadModal()
    }
  }, [])

  const handleSaveClick = useCallback(async () => {
    if (!generatedInputs) {
      showToast(t('toast.generateFirst'), 'error')
      return
    }

    try {
      const header = document.querySelector('dataviz-tool-header') as any
      if (!header) {
        showToast(t('toast.saveError'), 'error')
        return
      }

      const thumbnailDataUri = await getThumbnailDataUri()

      header.showSaveModal({
        name: currentProjectName || '',
        data: getProjectState(),
        thumbnailDataUri,
        existingProjectId: currentProjectId || null,
      })
    } catch (e) {
      console.error(e)
      showToast(t('toast.saveError'), 'error')
    }
  }, [generatedInputs, currentProjectName, currentProjectId, getThumbnailDataUri, getProjectState, t, showToast])

  const shouldRender = Boolean(generatedInputs)

  const previewStatus = (() => {
    if (tokenizerError) return t(tokenizerError as TranslationKey)
    if (tokenizerLoading && !tokenizer) return t('status.loadingDict')
    if (!shouldRender) return t('status.pressGenerate')
    if (!generatedInputs?.text.trim()) return t('status.enterText')
    if (!wordFrequencies.length) return t('status.noWords')
    return null
  })()

  useEffect(() => {
    customElements.whenDefined('dataviz-tool-header').then(() => {
      const header = document.querySelector('dataviz-tool-header') as any;
      if (header) {
        // Configure UI
        header.setConfig({
          logo: {
            type: 'text',
            text: 'Word Cloud',
            textClass: 'font-bold text-lg text-white'
          },
          buttons: [
            {
              label: t('header.loadProject'),
              action: handleLoadProjectClick,
              align: 'right'
            },
            {
              label: t('header.saveProject'),
              action: handleSaveClick,
              align: 'right'
            }
          ]
        })

        // Configure project management
        header.setProjectConfig({
          appName: 'word-cloud',
          onProjectLoad: async (projectData: any) => {
            try {
              setText(projectData.text)
              setStopwordsText(projectData.stopwordsText)
              setSettings(projectData.settings)
              setGeneratedInputs({
                text: projectData.text,
                stopwords: new Set(parseStopwords(projectData.stopwordsText)),
              })
            } catch (e) {
              console.error('Failed to restore project data:', e)
            }
          },
          onProjectSave: (meta: any) => {
            setCurrentProjectId(meta.id)
            setCurrentProjectName(meta.name)
          },
        })
      }
    })
  }, [handleLoadProjectClick, handleSaveClick, t]);

  return (
    <>
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
      </div>
    </>
  )
}

export default App
