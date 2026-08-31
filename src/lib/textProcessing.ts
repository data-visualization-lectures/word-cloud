import type { Tokenizer, IpadicFeatures } from 'kuromoji'
import type { PosType, TokenForm, WordFrequency } from '../types'

const ALL_POS = new Set<PosType>(['名詞', '動詞', '形容詞', '副詞'])
const NOISE_POS_DETAILS = new Set(['非自立', '代名詞', '数', '接尾'])

export const normalizeToken = (token: string): string => {
  return token.normalize('NFKC').toLocaleLowerCase('ja-JP')
}

const isNoiseNoun = (token: IpadicFeatures): boolean => {
  if (token.pos !== '名詞') return false
  return NOISE_POS_DETAILS.has(token.pos_detail_1) || NOISE_POS_DETAILS.has(token.pos_detail_2)
}

const isCompoundNounToken = (token: IpadicFeatures, excludeNoisePos: boolean): boolean => {
  if (token.pos !== '名詞') return false
  if (excludeNoisePos && isNoiseNoun(token)) return false
  return true
}

const tokenText = (token: IpadicFeatures, tokenForm: TokenForm): string => {
  if (tokenForm === 'surface') return token.surface_form
  if (token.basic_form && token.basic_form !== '*') return token.basic_form
  return token.surface_form
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

export interface TokenizeOptions {
  enabledPos?: PosType[]
  excludeNoisePos?: boolean
  compoundNouns?: boolean
  compoundMaxLength?: number
  tokenForm?: TokenForm
  minTokenLength?: number
}

const tokenizeWithKuromoji = (
  text: string,
  tokenizer: Tokenizer<IpadicFeatures>,
  stopwords: Set<string>,
  options: TokenizeOptions,
): Array<{ text: string; pos: string }> => {
  const enabledPos = new Set((options.enabledPos ?? ['名詞']).filter((pos) => ALL_POS.has(pos)))
  if (enabledPos.size === 0) enabledPos.add('名詞')
  const excludeNoisePos = options.excludeNoisePos ?? true
  const compoundNouns = options.compoundNouns ?? true
  const compoundMaxLength = Math.min(4, Math.max(2, options.compoundMaxLength ?? 3))
  const tokenForm = options.tokenForm ?? 'basic'
  const minTokenLength = options.minTokenLength ?? 2
  const rawTokens = tokenizer.tokenize(text)
  const result: Array<{ text: string; pos: string }> = []

  let index = 0
  while (index < rawTokens.length) {
    const token = rawTokens[index]

    if (compoundNouns && enabledPos.has('名詞') && isCompoundNounToken(token, excludeNoisePos)) {
      const group = [token]
      let cursor = index + 1
      while (
        cursor < rawTokens.length
        && group.length < compoundMaxLength
        && isCompoundNounToken(rawTokens[cursor], excludeNoisePos)
      ) {
        group.push(rawTokens[cursor])
        cursor += 1
      }

      if (group.length >= 2) {
        const compound = normalizeToken(group.map((item) => item.surface_form).join('').trim())
        if (!shouldSkipToken(compound, stopwords, minTokenLength)) {
          result.push({ text: compound, pos: '名詞' })
        }
        index = cursor
        continue
      }
    }

    if (enabledPos.has(token.pos as PosType)) {
      if (token.pos === '名詞' && excludeNoisePos && isNoiseNoun(token)) {
        index += 1
        continue
      }
      const normalized = normalizeToken(tokenText(token, tokenForm).trim())
      if (!shouldSkipToken(normalized, stopwords, minTokenLength)) {
        result.push({ text: normalized, pos: token.pos as string })
      }
    }

    index += 1
  }

  return result
}

const applyMerges = (
  words: WordFrequency[],
  merges?: Record<string, string>,
): WordFrequency[] => {
  if (!merges || Object.keys(merges).length === 0) return words

  const resolveTarget = (text: string): string => {
    const seen = new Set<string>()
    let current = text
    while (merges[current] && !seen.has(current)) {
      seen.add(current)
      current = merges[current]
    }
    return current
  }

  const counts = new Map<string, WordFrequency>()
  for (const word of words) {
    const target = resolveTarget(word.text)
    const existing = counts.get(target)
    if (existing) {
      existing.value += word.value
    } else {
      counts.set(target, { ...word, text: target })
    }
  }
  return Array.from(counts.values())
}

interface FrequencyOptions {
  text: string
  tokenizer: Tokenizer<IpadicFeatures> | null
  stopwords: Set<string>
  maxWords: number
  minTokenLength?: number
  enabledPos?: PosType[]
  excludeNoisePos?: boolean
  compoundNouns?: boolean
  compoundMaxLength?: number
  tokenForm?: TokenForm
  minFrequency?: number
  wordMerges?: Record<string, string>
}

export const computeWordFrequencies = ({
  text,
  tokenizer,
  stopwords,
  maxWords,
  minTokenLength = 2,
  enabledPos,
  excludeNoisePos,
  compoundNouns,
  compoundMaxLength,
  tokenForm,
  minFrequency = 1,
  wordMerges,
}: FrequencyOptions): WordFrequency[] => {
  if (!text.trim() || !tokenizer) return []

  const tokens = tokenizeWithKuromoji(text, tokenizer, stopwords, {
    enabledPos,
    excludeNoisePos,
    compoundNouns,
    compoundMaxLength,
    tokenForm,
    minTokenLength,
  })

  const counts = new Map<string, { value: number; pos: string }>()
  for (const token of tokens) {
    const existing = counts.get(token.text)
    if (existing) {
      existing.value += 1
    } else {
      counts.set(token.text, { value: 1, pos: token.pos })
    }
  }

  const merged = applyMerges(
    Array.from(counts.entries()).map(([word, { value, pos }]) => ({ text: word, value, pos })),
    wordMerges,
  )

  return merged
    .filter((word) => word.value >= minFrequency && !stopwords.has(word.text))
    .sort((a, b) => b.value - a.value || a.text.localeCompare(b.text, 'ja'))
    .slice(0, maxWords)
}

export const parseStopwords = (rawStopwords: string): string[] => {
  const candidates = rawStopwords
    .split(/\r?\n|,|，|、/u)
    .map((word) => normalizeToken(word.trim()))
    .filter(Boolean)

  return Array.from(new Set(candidates))
}

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (!inQuotes && (char === ',' || char === '\t')) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

const HEADER_WORDS = new Set(['word', '単語', '語', 'text', 'token', 'frequency', 'freq', '頻度', 'count', 'pos', '品詞'])

export const looksLikeFrequencyTable = (raw: string): boolean => {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return false
  const first = parseCsvLine(lines[0])
  if (first.length < 2) return false
  if (HEADER_WORDS.has(first[0].toLowerCase()) && HEADER_WORDS.has(first[1].toLowerCase())) return true
  const second = Number(first[1].replace(/,/g, ''))
  return Number.isFinite(second)
}

export const parseFrequencyTable = (
  raw: string,
  options: {
    stopwords?: Set<string>
    maxWords?: number
    minFrequency?: number
    wordMerges?: Record<string, string>
  } = {},
): WordFrequency[] => {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []

  const firstCells = parseCsvLine(lines[0])
  const hasHeader = firstCells.length >= 2 && HEADER_WORDS.has(firstCells[0].toLowerCase())
  const dataLines = hasHeader ? lines.slice(1) : lines
  const stopwords = options.stopwords ?? new Set<string>()
  const minFrequency = options.minFrequency ?? 1
  const maxWords = options.maxWords ?? 400

  const counts = new Map<string, WordFrequency>()
  for (const line of dataLines) {
    const cells = parseCsvLine(line)
    if (cells.length < 2) continue
    const text = normalizeToken(cells[0])
    const value = Number(cells[1].replace(/,/g, ''))
    if (!text || !Number.isFinite(value) || value <= 0) continue
    if (stopwords.has(text)) continue
    const pos = cells[2] || '名詞'
    const existing = counts.get(text)
    if (existing) {
      existing.value += value
    } else {
      counts.set(text, { text, value, pos })
    }
  }

  return applyMerges(Array.from(counts.values()), options.wordMerges)
    .filter((word) => word.value >= minFrequency)
    .sort((a, b) => b.value - a.value || a.text.localeCompare(b.text, 'ja'))
    .slice(0, maxWords)
}

export const addStopword = (stopwordsText: string, word: string): string => {
  const normalized = normalizeToken(word)
  if (!normalized) return stopwordsText
  const existing = new Set(parseStopwords(stopwordsText))
  if (existing.has(normalized)) return stopwordsText
  const trimmed = stopwordsText.trimEnd()
  return trimmed ? `${trimmed}\n${normalized}` : normalized
}
