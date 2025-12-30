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

    // 認証待ち: window.datavizAuth がない場合は少し待つ必要があるかもしれないが、
    // dataviz-auth-client.js は DOMContentLoaded で初期化し、セッションがあれば即 window.datavizAuth に入れる。
    // ただしタイミング依存があるため、リトライロジックか、dataviz-auth-client側のイベントがあると良いが、
    // ここではポーリングで待機する簡易実装とする。

    const tryLoad = async () => {
      // @ts-ignore
      if (!window.datavizAuth?.session) {
        return false
      }

      try {
        const data = await loadProject(projectId)
        // Load successful
        setText(data.text)
        setStopwordsText(data.stopwordsText)
        setSettings(data.settings)

        // メタデータとしてIDだけセット（名前などは取得できてないため仮）
        // GET /api/projects/[id] は本文だけ返すため、メタデータ(name)が不明。
        // これを解決するには一覧を取るか、APIでメタデータも返すようにするかだが、
        // 一旦仮の名前を設定し、保存時に更新することで対応、あるいは一覧から探す。
        // ここではAPIクライアントにメタデータ取得機能がないため、一覧から探す。

        try {
          const list = await api.listProjects('word-cloud')
          const meta = list.find(p => p.id === projectId)
          if (meta) {
            setCurrentProject(meta)
          } else {
            // リストにない（他人のプロジェクト？）場合はIDのみ保持
            setCurrentProject({
              id: projectId, name: 'Imported Project', app_name: 'word-cloud', created_at: '', updated_at: ''
            })
          }
        } catch {
          // リスト取得失敗時は仮セット
          setCurrentProject({
            id: projectId, name: 'Loaded Project', app_name: 'word-cloud', created_at: '', updated_at: ''
          })
        }

        setGeneratedInputs({
          text: data.text,
          stopwords: new Set(parseStopwords(data.stopwordsText)),
        })

        // URLからクエリパラメータを削除（オプション）
        // window.history.replaceState({}, '', window.location.pathname)

        return true
      } catch (e) {
        console.error("Failed to load project from URL", e)
        return true // エラーでもリトライ終了
      }
    }

    const intervalId = setInterval(async () => {
      const done = await tryLoad()
      if (done) clearInterval(intervalId)
    }, 500)

    // 10秒でタイムアウト
    setTimeout(() => clearInterval(intervalId), 10000)

    return () => clearInterval(intervalId)

  }, []) // 初回マウント時のみチェック（依存配列空でOK、内部で条件分岐）


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
