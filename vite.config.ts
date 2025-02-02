import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  esbuild: mode === 'production' ? {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  } : {},
  resolve: {
    alias: fs.readdirSync(path.join(__dirname, 'src'), { withFileTypes: true })
      .filter((f) => f.isDirectory())
      .map(({ name }) => (
        { find: name, replacement: path.join(__dirname, 'src', name) }
      )),
  },
  server: {
    port: 8080,
  },
}));
