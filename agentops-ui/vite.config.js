import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: '/Gemini3-Ocean-freight-AI-agent/',  // ⚠️ 請改成你的新 repo 名稱！
    plugins: [react()],
    server: {
        fs: {
            // Allow serving files from one level up to the project root
            allow: ['..']
        }
    }
})
