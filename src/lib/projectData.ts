import { normalizeSettings } from '../constants/settings'
import { DEFAULT_JA_STOPWORDS } from '../constants/stopwords'
import type { InputMode, ProjectData, ViewMode } from '../types'

export type RestoredProjectData = Required<ProjectData>

const normalizeWordMerges = (raw: unknown): Record<string, string> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(([source, target]) => typeof source === 'string' && typeof target === 'string')
  return Object.fromEntries(entries) as Record<string, string>
}

export const normalizeProjectData = (raw?: Partial<ProjectData> | null): RestoredProjectData => {
  const inputMode: InputMode = raw?.inputMode === 'frequency' ? 'frequency' : 'text'
  const viewMode: ViewMode = raw?.viewMode === 'bubble' ? 'bubble' : 'cloud'

  return {
    text: typeof raw?.text === 'string' ? raw.text : '',
    stopwordsText: typeof raw?.stopwordsText === 'string'
      ? raw.stopwordsText
      : DEFAULT_JA_STOPWORDS.join('\n'),
    settings: normalizeSettings(raw?.settings),
    inputMode,
    wordMerges: normalizeWordMerges(raw?.wordMerges),
    viewMode,
    showBoundingBoxes: raw?.showBoundingBoxes === true,
  }
}
