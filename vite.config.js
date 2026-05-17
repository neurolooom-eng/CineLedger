import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT: For GitHub Pages at https://<username>.github.io/CineLedger/
// the base must be '/CineLedger/'.
// If you deploy to Vercel/Netlify or a custom domain, change this to '/'.
export default defineConfig({
  plugins: [react()],
  base: '/CineLedger/',
});
