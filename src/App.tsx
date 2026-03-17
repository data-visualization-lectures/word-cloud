import { useMemo, useState, useRef, useEffect } from 'react'
import './App.css'
import { ControlsPanel } from './components/ControlsPanel'
import { WordCloudPreview, type WordCloudPreviewHandle } from './components/WordCloudPreview'
import { SaveProjectModal } from './components/SaveProjectModal'
import { ProjectListModal } from './components/ProjectListModal'
import { useProject } from './hooks/useProject'
import { blobToBase64 } from './lib/image-utils'
import { api } from './lib/api'
import { DEFAULT_COLOR_SCHEME_ID } from './constants/colors'
import { DEFAULT_JA_STOPWORDS } from './constants/stopwords'
import { useKuromojiTokenizer } from './hooks/useKuromojiTokenizer'
import { computeWordFrequencies, parseStopwords } from './lib/textProcessing'
import { useI18n } from './i18n'
import type { TranslationKey } from './i18n'
import type { ViewMode, WordCloudSettings, ProjectMeta } from './types'

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
    currentProject,
    setCurrentProject,
    loadProject,
    createNewProject,
    updateCurrentProject
  } = useProject()

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveModalInitialName, setSaveModalInitialName] = useState('')
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
    if (currentProject && currentProject.id === projectId) return // すでにロード済み

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

        try {
          const list = await api.listProjects('word-cloud')
          const meta = list.find(p => p.id === projectId)
          if (meta) {
            setCurrentProject(meta)
          } else {
            setCurrentProject({
              id: projectId, name: 'Imported Project', app_name: 'word-cloud', created_at: '', updated_at: ''
            })
          }
        } catch {
          setCurrentProject({
            id: projectId, name: 'Loaded Project', app_name: 'word-cloud', created_at: '', updated_at: ''
          })
        }

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

  const handleLoadProjectClick = () => {
    setIsLoadModalOpen(true)
  }

  const handleProjectSelect = async (project: ProjectMeta) => {
    try {
      const data = await loadProject(project.id)
      setText(data.text)
      setStopwordsText(data.stopwordsText)
      setSettings(data.settings)
      setCurrentProject(project)

      setGeneratedInputs({
        text: data.text,
        stopwords: new Set(parseStopwords(data.stopwordsText)),
      })

      setIsLoadModalOpen(false)
      showToast(t('toast.projectLoaded', { name: project.name }), 'success')
    } catch (e) {
      console.error(e)
      showToast(t('toast.projectLoadFailed'), 'error')
    }
  }

  const handleSaveClick = async () => {
    if (!generatedInputs) {
      showToast(t('toast.generateFirst'), 'error')
      return
    }

    try {
      const blob = await previewRef.current?.getThumbnailBlob() ?? null
      const base64 = blob ? await blobToBase64(blob) : undefined

      if (currentProject) {
        if (!confirm(t('confirm.overwrite', { name: currentProject.name }))) return

        await updateCurrentProject({
          name: currentProject.name,
          data: { text, stopwordsText, settings },
          thumbnail: base64
        })
        showToast(t('toast.saved'), 'success')
      } else {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        setSaveModalInitialName(`${year}-${month}-${day}`)

        setThumbnailForSave(blob)
        setIsSaveModalOpen(true)
      }
    } catch (e) {
      console.error(e)
      showToast(t('toast.saveError'), 'error')
    }
  }

  const handleSaveModalSubmit = async (name: string) => {
    const base64 = thumbnailForSave ? await blobToBase64(thumbnailForSave) : undefined
    try {
      await createNewProject({
        name,
        app_name: 'word-cloud',
        data: { text, stopwordsText, settings },
        thumbnail: base64
      })
      showToast(t('toast.savedNew'), 'success')
    } catch (e) {
      console.error(e)
      showToast(t('toast.saveFailed'), 'error')
    }
  }

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
      const header = document.querySelector('dataviz-tool-header');
      if (header) {
        // @ts-ignore
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
      }
    })
  }, [handleLoadProjectClick, handleSaveClick]);

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

        <SaveProjectModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSaveModalSubmit}
          initialName={saveModalInitialName}
          thumbnailBlob={thumbnailForSave}
        />

        <ProjectListModal
          isOpen={isLoadModalOpen}
          onClose={() => setIsLoadModalOpen(false)}
          onSelect={handleProjectSelect}
        />
      </div>
    </>
  )
}

export default App
