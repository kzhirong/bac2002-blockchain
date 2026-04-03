import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load from repo root .env (where ALCHEMY_AMOY_URL lives)
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '../..'), '');

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_ALCHEMY_AMOY_URL': JSON.stringify(
        rootEnv.ALCHEMY_AMOY_URL ?? rootEnv.VITE_ALCHEMY_AMOY_URL ?? '',
      ),
    },
  };
});
