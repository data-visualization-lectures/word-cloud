export const ASPECT_RATIOS = [
    { id: 'square' as const, label: '正方形 (1:1)', ratio: 1 },
    { id: 'portrait' as const, label: '縦長 (3:4)', ratio: 3 / 4 },
    { id: 'landscape' as const, label: '横長 (16:9)', ratio: 16 / 9 },
]

export const DEFAULT_ASPECT_RATIO = 'landscape'
