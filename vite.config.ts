import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.openai.com https://api.github.com; base-uri 'none'; form-action 'none'";

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'production-csp',
      apply: 'build',
      transformIndexHtml() {
        return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }];
      },
    },
  ],
  test: { environment: 'jsdom', pool: 'threads', maxWorkers: 1 },
});
