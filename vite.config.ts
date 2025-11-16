import { defineConfig, type PluginOption, type Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import react from '@vitejs/plugin-react'

const KUROMOJI_DICT_PATH = 'vendor/kuromoji/dict/'

const createKuromojiPlugin = (): PluginOption => {
  let resolvedBase = '/'

  type MiddlewareHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) => void

  const setHeaders = (server: { middlewares: Connect.Server }) => {
    const middleware: MiddlewareHandler = (req, res, next) => {
      if (!req.url) {
        next()
        return
      }
      if (req.url.startsWith(`${resolvedBase}${KUROMOJI_DICT_PATH}`)) {
        res.setHeader('Content-Encoding', 'identity')
      }
      next()
    }

    server.middlewares.use(middleware)
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
