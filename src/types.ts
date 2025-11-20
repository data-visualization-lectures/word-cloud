export type SpiralOption = 'archimedean' | 'rectangular'
export type ViewMode = 'cloud' | 'bubble'
export type AspectRatio = 'square' | 'portrait' | 'landscape'

export interface WordCloudSettings {
  maxWords: number
  fontSizeRange: [number, number]
  spiral: SpiralOption
  padding: number
  rotationAngles: number[]
  colorSchemeId: string
  aspectRatio: AspectRatio
}

export interface WordFrequency {
  text: string
  value: number
}
