import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    // The 3D experience (three + R3F + postprocessing) is lazy-loaded into its own chunk.
    chunkSizeWarningLimit: 1400,
  },
})
