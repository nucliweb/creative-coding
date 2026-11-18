import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        presenter: resolve(import.meta.dirname, 'presenter.html'),
        control: resolve(import.meta.dirname, 'control.html'),
      },
    },
  },
  test: { include: ['tests/**/*.test.js'] },
});
