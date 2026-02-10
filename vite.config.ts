import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:4242',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react()],
      build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-ui': ['lucide-react', 'html2canvas', 'jspdf', 'react-markdown']
                }
            }
        }
      },
      define: {
        // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY), // REMOVED for security
        // 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) // REMOVED for security
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
