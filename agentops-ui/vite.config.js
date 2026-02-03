import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    // 增加這行：路徑必須與你的 GitHub 倉庫名稱一致
    base: '/Gemini3-Ocean-freight-AI-agent/',
    plugins: [react()],
    server: {
        fs: {
            // Allow serving files from one level up to the project root
            allow: ['..']
        }
    }
})
