export type SpiralOption = 'archimedean' | 'rectangular'
export type ViewMode = 'cloud' | 'bubble'
export type AspectRatio = 'square' | 'portrait' | 'landscape'
export type ColorRule = 'scheme' | 'pos' | 'frequency'
export type PosType = '名詞' | '動詞' | '形容詞' | '副詞'
export type TokenForm = 'basic' | 'surface'
export type SizeScale = 'linear' | 'sqrt' | 'log'
export type FontFamilyId = 'sans' | 'serif' | 'rounded'
export type CanvasBackground = 'white' | 'dark' | 'transparent'
export type StylePresetId = 'report' | 'presentation' | 'dark'
export type InputMode = 'text' | 'frequency'

export const POS_OPTIONS: PosType[] = ['名詞', '動詞', '形容詞', '副詞']

export interface WordCloudSettings {
  maxWords: number
  fontSizeRange: [number, number]
  spiral: SpiralOption
  padding: number
  rotationAngles: number[]
  colorSchemeId: string
  colorRule: ColorRule
  aspectRatio: AspectRatio
  enabledPos: PosType[]
  excludeNoisePos: boolean
  compoundNouns: boolean
  compoundMaxLength: number
  tokenForm: TokenForm
  minFrequency: number
  sizeScale: SizeScale
  fontFamilyId: FontFamilyId
  fontWeight: number
  weightByFrequency: boolean
  canvasBackground: CanvasBackground
  layoutSeed: number
  chartTitle: string
  chartSource: string
}

export interface WordFrequency {
  text: string
  value: number
  pos?: string
}

export interface ProjectMeta {
  id: string
  name: string
  app_name: string
  storage_path?: string
  thumbnail_path?: string
  created_at: string
  updated_at: string
}

export interface ProjectData {
  text: string
  stopwordsText: string
  settings: WordCloudSettings
  inputMode?: InputMode
  wordMerges?: Record<string, string>
  viewMode?: ViewMode
  showBoundingBoxes?: boolean
}

export interface CreateProjectPayload {
  name: string
  app_name: string
  data: ProjectData
  thumbnail?: string
}

export interface UpdateProjectPayload {
  name?: string
  data?: ProjectData
  thumbnail?: string
}
