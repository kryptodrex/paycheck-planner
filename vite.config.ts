import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
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
})
