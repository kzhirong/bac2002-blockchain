import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Allow verifier app (localhost:3003) to send cross-origin requests
  server: {
    cors: true,
  },
});
