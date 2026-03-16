import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // これを追加
import path from 'path' // これも後で使うので追加

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // これを追加
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // @/ で src フォルダを参照できるように設定
    },
  },
})
