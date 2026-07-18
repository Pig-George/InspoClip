import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

import { appVersionDefine } from './version.config';

export default defineConfig({
  plugins: [react()],
  define: appVersionDefine,
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], include: ['src/**/*.test.{ts,tsx}'] },
});
