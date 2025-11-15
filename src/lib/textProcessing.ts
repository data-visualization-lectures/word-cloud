import TinySegmenter from 'tiny-segmenter'
import type { WordFrequency } from '../types'

const FALLBACK_DELIMITER =
  /[\s、。．，,.!！?？・「」『』（）()［］\[\]【】{}<>《》〈〉\/\\|:：;；"'“”'’・]+/u
const segmenter = new TinySegmenter()

export const normalizeToken = (token: string): string => {
  return token.normalize('NFKC').toLocaleLowerCase('ja-JP')
}

const shouldSkipToken = (
  token: string,
  stopwords: Set<string>,
  minTokenLength: number,
): boolean => {
  if (!token) return true
  if (token.length < minTokenLength) return true
  if (stopwords.has(token)) return true
  if (/^\d+$/.test(token)) return true
  return false
}

const tokenizeJapanese = (
  text: string,
  stopwords: Set<string>,
  minTokenLength: number,
): string[] => {
  const sentences = text
    .split(/[\n\r]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const tokens: string[] = []
  sentences.forEach((sentence) => {
    const segmented = segmenter.segment(sentence)
    tokens.push(...segmented)
  })

  const cleaned = tokens
    .flatMap((token) =>
      FALLBACK_DELIMITER.test(token) ? token.split(FALLBACK_DELIMITER) : [token],
    )
    .map((token) => normalizeToken(token.trim()))
    .filter((token) => !shouldSkipToken(token, stopwords, minTokenLength))

  return cleaned
}

interface FrequencyOptions {
  text: string
  stopwords: Set<string>
  maxWords: number
  minTokenLength?: number
}

export const computeWordFrequencies = ({
  text,
  stopwords,
  maxWords,
  minTokenLength = 2,
}: FrequencyOptions): WordFrequency[] => {
  if (!text.trim()) return []

  const tokens = tokenizeJapanese(text, stopwords, minTokenLength)

  const counts = new Map<string, number>()

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([word, value]) => ({ text: word, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, maxWords)
}

export const parseStopwords = (rawStopwords: string): string[] => {
  const candidates = rawStopwords
    .split(/\r?\n|,|，|、/u)
    .map((word) => normalizeToken(word.trim()))
    .filter(Boolean)

  return Array.from(new Set(candidates))
}
