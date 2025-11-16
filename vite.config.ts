import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'

const KUROMOJI_DICT_PATH = 'vendor/kuromoji/dict/'

const createKuromojiPlugin = (): PluginOption => {
  let resolvedBase = '/'

  const setHeaders = (server: { middlewares: { use: (handler: any) => void } }) => {
    server.middlewares.use((req, res, next) => {
      if (!req.url) {
        next()
        return
      }
      if (req.url.startsWith(`${resolvedBase}${KUROMOJI_DICT_PATH}`)) {
        res.setHeader('Content-Encoding', 'identity')
      }
      next()
    })
  }

  return {
    name: 'kuromoji-dictionary-static-server',
    configResolved(config) {
      resolvedBase = config.base?.endsWith('/') ? config.base : `${config.base ?? ''}/`
    },
    configureServer: setHeaders,
    configurePreviewServer: setHeaders,
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), createKuromojiPlugin()],
})
