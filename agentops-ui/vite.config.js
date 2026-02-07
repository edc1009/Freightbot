import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
<<<<<<< HEAD
    base: './',
=======
    // 增加這行：路徑必須與你的 GitHub 倉庫名稱一致
    base: '/Gemini3-Ocean-freight-AI-agent/',
>>>>>>> 1619602342e0b2b612d682a3965503a4f3de2ce5
    plugins: [react()],
    server: {
        fs: {
            // Allow serving files from one level up to the project root
            allow: ['..']
        }
    }
})
