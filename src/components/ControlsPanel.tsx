import type { ChangeEvent } from 'react'
import { COLOR_SCHEMES } from '../constants/colors'
import type { WordCloudSettings } from '../types'

interface ControlsPanelProps {
  text: string
  onTextChange: (value: string) => void
  stopwordsText: string
  onStopwordsChange: (value: string) => void
  settings: WordCloudSettings
  onSettingsChange: (patch: Partial<WordCloudSettings>) => void
  tokenCount: number
}

const FONT_MIN_LIMIT = 10
const FONT_MAX_LIMIT = 160
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const ControlsPanel = ({
  text,
  onTextChange,
  stopwordsText,
  onStopwordsChange,
  settings,
  onSettingsChange,
  tokenCount,
}: ControlsPanelProps) => {
  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(event.target.value)
  }

  const handleStopwordsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onStopwordsChange(event.target.value)
  }

  const handleFontSizeChange = (index: 0 | 1, value: number) => {
    const nextRange: [number, number] = [...settings.fontSizeRange]
    if (index === 0) {
      nextRange[0] = Math.max(FONT_MIN_LIMIT, Math.min(value, nextRange[1] - 4))
    } else {
      nextRange[1] = Math.min(FONT_MAX_LIMIT, Math.max(value, nextRange[0] + 4))
    }
    onSettingsChange({ fontSizeRange: nextRange })
  }

  return (
    <section className="controls-panel">
      <h1>Japanese Word Cloud</h1>
      <p className="panel-description">
        テキストを貼り付けて、SVGとして使える日本語ワードクラウドを生成します。
      </p>

      <div className="form-section">
        <label className="field-label" htmlFor="text-input">
          テキスト入力
        </label>
        <textarea
          id="text-input"
          className="textarea"
          value={text}
          onChange={handleTextareaChange}
          placeholder="文章を入力してください"
          rows={10}
        />
        <div className="field-hint">
          語数: <strong>{tokenCount}</strong>
        </div>
      </div>

      <div className="form-grid">
        <label className="field-label" htmlFor="max-words">
          最大語数
        </label>
        <input
          type="number"
          id="max-words"
          min={20}
          max={400}
          value={settings.maxWords}
          onChange={(event) =>
            onSettingsChange({
              maxWords: clamp(Number(event.target.value) || 0, 20, 400),
            })
          }
        />

        <label className="field-label">フォントサイズ</label>
        <div className="range-inputs">
          <input
            type="number"
            min={FONT_MIN_LIMIT}
            max={FONT_MAX_LIMIT}
            value={settings.fontSizeRange[0]}
            onChange={(event) => handleFontSizeChange(0, Number(event.target.value))}
          />
          <span className="range-separator">〜</span>
          <input
            type="number"
            min={FONT_MIN_LIMIT}
            max={FONT_MAX_LIMIT}
            value={settings.fontSizeRange[1]}
            onChange={(event) => handleFontSizeChange(1, Number(event.target.value))}
          />
        </div>

        <label className="field-label" htmlFor="color-scheme">
          カラースキーム
        </label>
        <select
          id="color-scheme"
          value={settings.colorSchemeId}
          onChange={(event) => onSettingsChange({ colorSchemeId: event.target.value })}
        >
          {COLOR_SCHEMES.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.label}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="spiral">
          レイアウト
        </label>
        <select
          id="spiral"
          value={settings.spiral}
          onChange={(event) =>
            onSettingsChange({ spiral: event.target.value as WordCloudSettings['spiral'] })
          }
        >
          <option value="archimedean">アーキメディアン</option>
          <option value="rectangular">矩形</option>
        </select>

        <label className="field-label" htmlFor="padding">
          単語間隔
        </label>
        <input
          type="number"
          id="padding"
          min={0}
          max={20}
          value={settings.padding}
          onChange={(event) =>
            onSettingsChange({ padding: clamp(Number(event.target.value) || 0, 0, 20) })
          }
        />
      </div>

      <div className="form-section">
        <label className="field-label" htmlFor="stopwords">
          ストップワード
        </label>
        <textarea
          id="stopwords"
          className="textarea small"
          value={stopwordsText}
          onChange={handleStopwordsChange}
          rows={8}
        />
        <p className="field-hint">改行またはカンマ区切りで入力。正規化して比較します。</p>
      </div>
    </section>
  )
}
