const DictionaryLoader = require('kuromoji/src/loader/DictionaryLoader')

const toError = (cause) => {
  if (cause instanceof Error) return cause
  return new Error(typeof cause === 'string' ? cause : '辞書の読み込みに失敗しました。')
}

class PlainDictionaryLoader extends DictionaryLoader {
  loadArrayBuffer(file, callback) {
    const normalizedUrl = file.replace(/\.gz$/, '')

    fetch(normalizedUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`辞書ファイルの取得に失敗しました: ${response.status}`)
        }
        return response.arrayBuffer()
      })
      .then((buffer) => {
        callback(null, buffer)
      })
      .catch((error) => {
        callback(toError(error))
      })
  }
}

module.exports = PlainDictionaryLoader
