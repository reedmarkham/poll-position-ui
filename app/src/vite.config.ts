import { defineConfig } from 'vite';

// Optional: include aliases or plugins if needed
export default defineConfig({
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  },
});
