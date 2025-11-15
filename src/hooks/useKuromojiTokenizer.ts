import { useEffect, useState } from 'react'
import type { Tokenizer, IpadicFeatures } from 'kuromoji'

const KUROMOJI_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js'
const KUROMOJI_SCRIPT_ID = 'kuromoji-script'
const KUROMOJI_DICT_PATH = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/'

let scriptPromise: Promise<void> | null = null

const ensureKuromojiScript = () => {
  if (window.kuromoji) {
    console.debug('[useKuromojiTokenizer] window.kuromoji already available')
    return Promise.resolve()
  }

  if (scriptPromise) {
    console.debug('[useKuromojiTokenizer] script already loading')
    return scriptPromise
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    let script = document.getElementById(KUROMOJI_SCRIPT_ID) as HTMLScriptElement | null

    if (script && (script as HTMLScriptElement).dataset.loaded === 'true') {
      resolve()
      return
    }

    const handleLoad = () => {
      console.debug('[useKuromojiTokenizer] script loaded')
      if (script) {
        script.dataset.loaded = 'true'
      }
      resolve()
    }

    const handleError = () => {
      console.error('[useKuromojiTokenizer] script failed to load', KUROMOJI_SCRIPT_SRC)
      reject(new Error('kuromojiスクリプトの読み込みに失敗しました。'))
    }

    if (!script) {
      console.debug('[useKuromojiTokenizer] injecting kuromoji script', KUROMOJI_SCRIPT_SRC)
      script = document.createElement('script')
      script.id = KUROMOJI_SCRIPT_ID
      script.src = KUROMOJI_SCRIPT_SRC
      script.async = true
      script.addEventListener('load', handleLoad, { once: true })
      script.addEventListener('error', handleError, { once: true })
      document.head.appendChild(script)
    } else {
      console.debug('[useKuromojiTokenizer] reusing existing script tag')
      script.addEventListener('load', handleLoad, { once: true })
      script.addEventListener('error', handleError, { once: true })
    }
  })

  return scriptPromise
}

interface KuromojiState {
  tokenizer: Tokenizer<IpadicFeatures> | null
  loading: boolean
  error: string | null
}

export const useKuromojiTokenizer = (): KuromojiState => {
  const [tokenizer, setTokenizer] = useState<Tokenizer<IpadicFeatures> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadTokenizer = () => {
      ensureKuromojiScript()
        .then(() => {
          if (!isMounted) return

          const kuromojiLib = window.kuromoji

          if (!kuromojiLib) {
            setError('kuromojiのスクリプトが読み込まれていません。')
            setLoading(false)
            return
          }

          kuromojiLib.builder({ dicPath: KUROMOJI_DICT_PATH }).build((err, loadedTokenizer) => {
            if (!isMounted) return

            if (err || !loadedTokenizer) {
              setError(err?.message ?? '辞書の読み込みに失敗しました。')
              setLoading(false)
              return
            }

            setTokenizer(loadedTokenizer)
            setLoading(false)
          })
        })
        .catch((err) => {
          if (!isMounted) return
          const message = err instanceof Error ? err.message : 'kuromojiの読み込みに失敗しました。'
          setError(message)
          setLoading(false)
        })
    }

    loadTokenizer()

    return () => {
      isMounted = false
    }
  }, [])

  return { tokenizer, loading, error }
}
