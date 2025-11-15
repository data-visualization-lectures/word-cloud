import type kuromoji from 'kuromoji'

declare global {
  interface Window {
    kuromoji?: typeof kuromoji
  }
}

export {}
