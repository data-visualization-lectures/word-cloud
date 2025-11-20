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
