import { defineConfig } from 'vitest/config'

import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/__tests__/*'],
  },
  resolve: {
    alias: [
      {
        find: /@guide-mini-vue\/(\w*)/,
        replacement: path.resolve(__dirname, 'packages') + "/$1/src"
      }
    ]
  }
})