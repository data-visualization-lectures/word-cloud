export type SpiralOption = 'archimedean' | 'rectangular'

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
