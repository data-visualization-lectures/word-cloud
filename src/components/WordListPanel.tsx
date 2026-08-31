import { useMemo, useState } from 'react'
import type { WordFrequency } from '../types'
import { useI18n } from '../i18n'

interface WordListPanelProps {
  words: WordFrequency[]
  onExclude: (text: string) => void
  onMerge: (texts: string[]) => void
}

export const WordListPanel = ({ words, onExclude, onMerge }: WordListPanelProps) => {
  const { t } = useI18n()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const total = useMemo(
    () => words.reduce((sum, word) => sum + word.value, 0),
    [words],
  )

  const toggleSelected = (text: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(text)) next.delete(text)
      else next.add(text)
      return next
    })
  }

  const handleMerge = () => {
    const texts = words.map((word) => word.text).filter((text) => selected.has(text))
    if (texts.length < 2) return
    onMerge(texts)
    setSelected(new Set())
  }

  if (!words.length) return null

  return (
    <div className="word-list">
      <p className="field-hint">{t('controls.wordListHint')}</p>
      <div className="word-list-actions">
        <button
          type="button"
          className="button-secondary compact-button"
          onClick={handleMerge}
          disabled={selected.size < 2}
        >
          {t('controls.merge')}
        </button>
      </div>
      <div className="word-list-table-wrap">
        <table className="word-list-table">
          <thead>
            <tr>
              <th aria-label="select" />
              <th>{t('controls.wordList')}</th>
              <th>{t('controls.frequency')}</th>
              <th>{t('controls.share')}</th>
              <th>{t('controls.posFilter')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {words.map((word) => {
              const share = total > 0 ? (word.value / total) * 100 : 0
              return (
                <tr key={word.text}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(word.text)}
                      onChange={() => toggleSelected(word.text)}
                      aria-label={word.text}
                    />
                  </td>
                  <td className="word-list-term">{word.text}</td>
                  <td className="numeric">{word.value}</td>
                  <td className="numeric">{share.toFixed(1)}%</td>
                  <td>{word.pos ?? ''}</td>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onExclude(word.text)}
                    >
                      {t('controls.exclude')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
