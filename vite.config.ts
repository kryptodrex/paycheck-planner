import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import fs from 'fs'

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version?: string }
const appVersion = packageJson.version ?? '0.0.0'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          define: {
            'process.env.FEEDBACK_FORM_URL': JSON.stringify(process.env.FEEDBACK_FORM_URL ?? ''),
            'process.env.FEEDBACK_FORM_ENTRY_EMAIL': JSON.stringify(process.env.FEEDBACK_FORM_ENTRY_EMAIL ?? ''),
            'process.env.FEEDBACK_FORM_ENTRY_CATEGORY': JSON.stringify(process.env.FEEDBACK_FORM_ENTRY_CATEGORY ?? ''),
            'process.env.FEEDBACK_FORM_ENTRY_SUBJECT': JSON.stringify(process.env.FEEDBACK_FORM_ENTRY_SUBJECT ?? ''),
            'process.env.FEEDBACK_FORM_ENTRY_DETAILS': JSON.stringify(process.env.FEEDBACK_FORM_ENTRY_DETAILS ?? ''),
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }

          if (id.includes('/node_modules/lucide-react/')) {
            return 'icons-vendor';
          }

          if (
            id.includes('/node_modules/jspdf/') ||
            id.includes('/node_modules/jspdf-autotable/')
          ) {
            return 'jspdf-vendor';
          }

          if (id.includes('/node_modules/pdf-lib/') || id.includes('/node_modules/@pdf-lib/')) {
            return 'pdf-lib-vendor';
          }

          if (
            id.includes('/node_modules/html2canvas/') ||
            id.includes('/node_modules/dompurify/') ||
            id.includes('/node_modules/canvg/')
          ) {
            return 'canvas-vendor';
          }

          return undefined;
        },
      },
    },
  },
})
