import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: './',
    plugins: [react()],
    server: {
        fs: {
            // Allow serving files from one level up to the project root
            allow: ['..']
        }
    }
})
