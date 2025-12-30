export type SpiralOption = 'archimedean' | 'rectangular'
export type ViewMode = 'cloud' | 'bubble'
export type AspectRatio = 'square' | 'portrait' | 'landscape'
export type ColorRule = 'scheme' | 'pos' | 'frequency'

export interface WordCloudSettings {
  maxWords: number
  fontSizeRange: [number, number]
  spiral: SpiralOption
  padding: number
  rotationAngles: number[]
  colorSchemeId: string
  colorRule: ColorRule
  aspectRatio: AspectRatio
}


export interface WordFrequency {
  text: string
  value: number
  pos?: string
}

// API Types
export interface ProjectMeta {
  id: string
  name: string
  app_name: string
  storage_path?: string // Optional in list response, present in create response
  thumbnail_path?: string
  created_at: string
  updated_at: string
}

export interface ProjectData {
  text: string
  stopwordsText: string
  settings: WordCloudSettings
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
