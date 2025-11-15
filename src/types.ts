export type SpiralOption = 'archimedean' | 'rectangular'
export type ViewMode = 'cloud' | 'bubble'

export interface WordCloudSettings {
  maxWords: number
  fontSizeRange: [number, number]
  spiral: SpiralOption
  padding: number
  rotationAngles: number[]
  colorSchemeId: string
}

export interface WordFrequency {
  text: string
  value: number
}
