import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'SURVEYJS_'],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 4004}`,
        changeOrigin: true,
      },
    },
  },
});
