import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { ControlsPanel } from './components/ControlsPanel'
import { WordCloudPreview, type WordCloudPreviewHandle } from './components/WordCloudPreview'
import { useProject } from './hooks/useProject'
import { blobToBase64 } from './lib/image-utils'
import { DEFAULT_JA_STOPWORDS } from './constants/stopwords'
import { DEFAULT_SETTINGS, applyStylePreset } from './constants/settings'
import { useKuromojiTokenizer } from './hooks/useKuromojiTokenizer'
import { normalizeProjectData } from './lib/projectData'
import {
  addStopword,
  computeWordFrequencies,
  parseFrequencyTable,
  parseStopwords,
} from './lib/textProcessing'
import { useI18n } from './i18n'
import type { TranslationKey } from './i18n'
import type { InputMode, ProjectData, StylePresetId, ViewMode, WordCloudSettings } from './types'

const defaultStopwords = DEFAULT_JA_STOPWORDS.join('\n')

function App() {
  const { t } = useI18n()
  const params = new URLSearchParams(window.location.search)
  const [text, setText] = useState(t('sampleText'))
  const [stopwordsText, setStopwordsText] = useState(defaultStopwords)
  const [settings, setSettings] = useState<WordCloudSettings>(DEFAULT_SETTINGS)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [wordMerges, setWordMerges] = useState<Record<string, string>>({})
  const { loadProject } = useProject()
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string>('')
  const previewRef = useRef<WordCloudPreviewHandle>(null)
  const { tokenizer, loading: tokenizerLoading, error: tokenizerError } = useKuromojiTokenizer()
  const [viewMode, setViewMode] = useState<ViewMode>('cloud')
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false)
  const [generatedText, setGeneratedText] = useState<string | null>(
    params.get('projectId') ? null : t('sampleText'),
  )

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000) => {
    const header = document.querySelector('dataviz-tool-header')
    if (header && (header as any).showMessage) {
      (header as any).showMessage(message, type, duration)
    } else if (type === 'error') {
      console.error(message)
    } else {
      console.log(message)
    }
  }, [])

  const showProcessingToast = useCallback((message: string) => {
    showToast(message, 'info', 5000)
  }, [showToast])

  const installHeaderProcessingToasts = useCallback((header: any) => {
    if (!header || header.__dvzNativeProjectProcessingToasts === '1' || header.__dvzProcessingToastsInstalled === '1') return

    if (typeof header.showLoadModal === 'function') {
      const originalShowLoadModal = header.showLoadModal.bind(header)
      header.showLoadModal = (...args: any[]) => {
        showProcessingToast(t('processing.projectList'))
        return originalShowLoadModal(...args)
      }
    }

    if (typeof header.loadProject === 'function') {
      const originalLoadProject = header.loadProject.bind(header)
      header.loadProject = (...args: any[]) => {
        showProcessingToast(t('processing.projectLoad'))
        return originalLoadProject(...args)
      }
    }

    if (typeof header.saveProject === 'function') {
      const originalSaveProject = header.saveProject.bind(header)
      header.saveProject = (...args: any[]) => {
        showProcessingToast(t('processing.projectSave'))
        return originalSaveProject(...args)
      }
    }

    header.__dvzProcessingToastsInstalled = '1'
  }, [showProcessingToast, t])

  const stopwordsSet = useMemo(() => new Set(parseStopwords(stopwordsText)), [stopwordsText])

  const wordFrequencies = useMemo(() => {
    if (!generatedText) return []
    if (inputMode === 'frequency') {
      return parseFrequencyTable(generatedText, {
        stopwords: stopwordsSet,
        maxWords: settings.maxWords,
        minFrequency: settings.minFrequency,
        wordMerges,
      })
    }
    return computeWordFrequencies({
      text: generatedText,
      tokenizer,
      stopwords: stopwordsSet,
      maxWords: settings.maxWords,
      enabledPos: settings.enabledPos,
      excludeNoisePos: settings.excludeNoisePos,
      compoundNouns: settings.compoundNouns,
      compoundMaxLength: settings.compoundMaxLength,
      tokenForm: settings.tokenForm,
      minFrequency: settings.minFrequency,
      wordMerges,
    })
  }, [
    generatedText,
    inputMode,
    tokenizer,
    stopwordsSet,
    settings.maxWords,
    settings.enabledPos,
    settings.excludeNoisePos,
    settings.compoundNouns,
    settings.compoundMaxLength,
    settings.tokenForm,
    settings.minFrequency,
    wordMerges,
  ])

  const handleSettingsChange = (patch: Partial<WordCloudSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  const handleGenerate = useCallback(() => {
    setGeneratedText(text)
  }, [text])

  const handleExcludeWord = useCallback((word: string) => {
    setStopwordsText((prev) => addStopword(prev, word))
  }, [])

  const handleMergeWords = useCallback((texts: string[]) => {
    if (texts.length < 2) return
    const [target, ...sources] = texts
    setWordMerges((prev) => {
      const next = { ...prev }
      for (const source of sources) next[source] = target
      return next
    })
  }, [])

  const handleApplyPreset = useCallback((presetId: StylePresetId) => {
    setSettings((prev) => applyStylePreset(prev, presetId))
  }, [])

  const handleRelayout = useCallback(() => {
    setSettings((prev) => ({ ...prev, layoutSeed: prev.layoutSeed + 1 }))
  }, [])

  const applyProjectData = useCallback((raw?: Partial<ProjectData> | null) => {
    const project = normalizeProjectData(raw)
    setText(project.text)
    setStopwordsText(project.stopwordsText)
    setSettings(project.settings)
    setInputMode(project.inputMode)
    setWordMerges(project.wordMerges)
    setViewMode(project.viewMode)
    setShowBoundingBoxes(project.showBoundingBoxes)
    setGeneratedText(project.text)
  }, [
    setText,
    setStopwordsText,
    setSettings,
    setInputMode,
    setWordMerges,
    setViewMode,
    setShowBoundingBoxes,
    setGeneratedText,
  ])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('projectId')
    if (!projectId) return
    if (currentProjectId && currentProjectId === projectId) return

    const tryLoad = async () => {
      const sb = window.datavizSupabase
      if (!sb) return false
      const { data } = await sb.auth.getSession()
      if (!data.session) return false

      try {
        showProcessingToast(t('processing.projectLoad'))
        const project = await loadProject(projectId)
        applyProjectData(project)
        const header = document.querySelector('dataviz-tool-header') as any
        const context = header?.getProjectContext?.()
        setCurrentProjectId(context?.canOverwrite ? context.projectId || projectId : null)
        setCurrentProjectName(context?.projectName || '')
        return true
      } catch (error) {
        console.error('Failed to load project from URL', error)
        return true
      }
    }

    const intervalId = setInterval(async () => {
      const done = await tryLoad()
      if (done) clearInterval(intervalId)
    }, 500)
    const timeoutId = setTimeout(() => clearInterval(intervalId), 10000)
    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [applyProjectData, currentProjectId, loadProject, showProcessingToast, t])

  const getProjectState = useCallback((): ProjectData => {
    return { text, stopwordsText, settings, inputMode, wordMerges, viewMode, showBoundingBoxes }
  }, [text, stopwordsText, settings, inputMode, wordMerges, viewMode, showBoundingBoxes])

  const getThumbnailDataUri = useCallback(async () => {
    const blob = await previewRef.current?.getThumbnailBlob() ?? null
    if (!blob) return null
    return await blobToBase64(blob) as string
  }, [])

  const handleLoadProjectClick = useCallback(() => {
    const header = document.querySelector('dataviz-tool-header') as any
    header?.showLoadModal()
  }, [])

  const handleSaveClick = useCallback(async () => {
    if (!generatedText) {
      showToast(t('toast.generateFirst'), 'error')
      return
    }
    try {
      const header = document.querySelector('dataviz-tool-header') as any
      if (!header) {
        showToast(t('toast.saveError'), 'error')
        return
      }
      showProcessingToast(t('processing.savePrep'))
      const thumbnailDataUri = await getThumbnailDataUri()
      header.showSaveModal({
        name: currentProjectName || '',
        data: getProjectState(),
        thumbnailDataUri,
        existingProjectId: currentProjectId || null,
      })
    } catch (error) {
      console.error(error)
      showToast(t('toast.saveError'), 'error')
    }
  }, [generatedText, currentProjectName, currentProjectId, getThumbnailDataUri, getProjectState, t, showToast, showProcessingToast])

  const shouldRender = Boolean(generatedText)
  const previewStatus = (() => {
    if (inputMode === 'text') {
      if (tokenizerError) return t(tokenizerError as TranslationKey)
      if (tokenizerLoading && !tokenizer) return t('status.loadingDict')
    }
    if (!shouldRender) return t('status.pressGenerate')
    if (!generatedText?.trim()) return t('status.enterText')
    if (!wordFrequencies.length) return t('status.noWords')
    return null
  })()

  useEffect(() => {
    customElements.whenDefined('dataviz-tool-header').then(() => {
      const header = document.querySelector('dataviz-tool-header') as any
      if (!header) return
      installHeaderProcessingToasts(header)
      header.setConfig({
        logo: {
          type: 'text',
          text: 'Word Cloud',
          textClass: 'font-bold text-lg text-white',
        },
        buttons: [
          { label: t('header.loadProject'), action: handleLoadProjectClick, align: 'right' },
          { label: t('header.saveProject'), action: handleSaveClick, align: 'right' },
        ],
      })
      header.setProjectConfig({
        appName: 'word-cloud',
        toolName: 'ワードクラウド',
        toolNameEn: 'Word Cloud',
        onProjectLoad: async (projectData: any, meta: any = {}) => {
          try {
            setCurrentProjectId(meta.canOverwrite ? meta.projectId : null)
            setCurrentProjectName(meta.projectName || '')
            applyProjectData(projectData)
          } catch (error) {
            console.error('Failed to restore project data:', error)
          }
        },
        onProjectSave: (meta: any) => {
          setCurrentProjectId(meta.id)
          setCurrentProjectName(meta.name)
        },
      })
    })
  }, [applyProjectData, handleLoadProjectClick, handleSaveClick, installHeaderProcessingToasts, t])

  return (
    <div className="app-shell">
      <main className="word-cloud-app">
        <ControlsPanel
          key={generatedText ? 'generated' : 'draft'}
          text={text}
          onTextChange={setText}
          stopwordsText={stopwordsText}
          onStopwordsChange={setStopwordsText}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onApplyPreset={handleApplyPreset}
          tokenCount={wordFrequencies.length}
          words={wordFrequencies}
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          onGenerate={handleGenerate}
          hasGenerated={Boolean(generatedText)}
          showBoundingBoxes={showBoundingBoxes}
          onShowBoundingBoxesChange={setShowBoundingBoxes}
          onExcludeWord={handleExcludeWord}
          onMergeWords={handleMergeWords}
        />
        <WordCloudPreview
          ref={previewRef}
          words={wordFrequencies}
          settings={settings}
          statusMessage={previewStatus}
          viewMode={viewMode}
          showBoundingBoxes={showBoundingBoxes}
          projectName={currentProjectName}
          onViewModeChange={setViewMode}
          onRelayout={handleRelayout}
          onExcludeWord={handleExcludeWord}
        />
      </main>
    </div>
  )
}

export default App
