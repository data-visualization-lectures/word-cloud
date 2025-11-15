import { useEffect, useState } from 'react'
import type { Tokenizer, IpadicFeatures } from 'kuromoji'

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

    const loadTokenizer = async () => {
      try {
        const kuromojiModule = (await import('kuromoji')) as
          | typeof import('kuromoji')
          | { default: typeof import('kuromoji') }
        const kuromojiLib = 'default' in kuromojiModule ? kuromojiModule.default : kuromojiModule

        kuromojiLib.builder({ dicPath: '/dict' }).build((err, loadedTokenizer) => {
          if (!isMounted) return

          if (err || !loadedTokenizer) {
            setError(err?.message ?? '辞書の読み込みに失敗しました。')
            setLoading(false)
            return
          }

          setTokenizer(loadedTokenizer)
          setLoading(false)
        })
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : '辞書の読み込みに失敗しました。'
        setError(message)
        setLoading(false)
      }
    }

    loadTokenizer()

    return () => {
      isMounted = false
    }
  }, [])

  return { tokenizer, loading, error }
}
