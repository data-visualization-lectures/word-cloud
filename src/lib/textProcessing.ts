import type { Tokenizer, IpadicFeatures } from 'kuromoji'
import type { WordFrequency } from '../types'

const TARGET_POS = new Set(['名詞', '動詞', '形容詞', '副詞'])
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

const tokenizeWithKuromoji = (
  text: string,
  tokenizer: Tokenizer<IpadicFeatures>,
  stopwords: Set<string>,
  minTokenLength: number,
): string[] => {
  const baseTokens = tokenizer.tokenize(text)

  return baseTokens
    .filter((token) => TARGET_POS.has(token.pos as string))
    .map((token) => (token.basic_form && token.basic_form !== '*' ? token.basic_form : token.surface_form))
    .map((token) => normalizeToken(token.trim()))
    .filter((token) => !shouldSkipToken(token, stopwords, minTokenLength))
}

interface FrequencyOptions {
  text: string
  tokenizer: Tokenizer<IpadicFeatures> | null
  stopwords: Set<string>
  maxWords: number
  minTokenLength?: number
}

export const computeWordFrequencies = ({
  text,
  tokenizer,
  stopwords,
  maxWords,
  minTokenLength = 2,
}: FrequencyOptions): WordFrequency[] => {
  if (!text.trim() || !tokenizer) return []

  const tokens = tokenizeWithKuromoji(text, tokenizer, stopwords, minTokenLength)

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
