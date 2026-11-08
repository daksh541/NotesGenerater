import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const apiProxyTarget = (globalThis as any).process?.env?.VITE_API_PROXY || 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.ts'],
        exclude: ['e2e/**', 'node_modules/**', 'dist/**']
    },
    server: {
        proxy: {
            '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
            },
            '/uploads': {
                target: apiProxyTarget,
                changeOrigin: true,
            }
        }
    }

})
