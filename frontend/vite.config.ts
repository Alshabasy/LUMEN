import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import horizonsHandler from '../api/horizons.ts'
import orbitsHandler from '../api/orbits.ts'

function localHorizonsFunction() {
  return {
    name: 'local-horizons-function',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/horizons', async (request, response, next) => {
        let statusCode = 200
        let body: unknown
        const headers: Record<string, string> = {}
        try {
          await horizonsHandler(
            {
              method: request.method,
              url: `/api/horizons${request.url ?? ''}`,
            },
            {
              status(code) {
                statusCode = code
                return this
              },
              setHeader(name, value) {
                headers[name] = value
              },
              json(payload) {
                body = payload
              },
            },
          )
          response.statusCode = statusCode
          for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
          response.end(JSON.stringify(body))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

function localOrbitsFunction() {
  return {
    name: 'local-jpl-orbits-function',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/orbits', async (request, response, next) => {
        let statusCode = 200
        let body: unknown
        const headers: Record<string, string> = {}
        try {
          await orbitsHandler(
            { method: request.method, url: `/api/orbits${request.url ?? ''}` },
            {
              status(code) { statusCode = code; return this },
              setHeader(name, value) { headers[name] = value },
              json(payload) { body = payload },
            },
          )
          response.statusCode = statusCode
          for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
          response.end(JSON.stringify(body))
        } catch (error) { next(error) }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localHorizonsFunction(), localOrbitsFunction()],
})
