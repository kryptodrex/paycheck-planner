import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __CURRENCY_API_URL__: JSON.stringify('http://localhost:3000/currency-conversion'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Safeguard against loading two physical React copies under vitest (which
    // leaves react-dom with a null dispatcher: "Cannot read ... 'useState'").
    // The workspace also pins react/react-dom to a single version via pnpm
    // overrides (mobile's Expo SDK 54 requires exactly 19.1.0).
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    css: true,
  },
});
