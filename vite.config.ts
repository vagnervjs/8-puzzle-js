// import { defineConfig } from 'vite'; // Using JSDoc type hint instead

// https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default {
  // Base path for GitHub Pages deployment
  base: '/8-puzzle-js/',
  // No specific plugins needed for basic TS and static asset serving from root.
  // Vite handles TypeScript compilation out of the box.
  // It will serve index.html from the project root by default.
  server: {
    open: true, // Automatically open in browser
    port: 3000   // Optional: specify a port
  },
  build: {
    // We are using esbuild directly for our main build script in package.json.
    // This build section in vite.config.ts would be for if we used `vite build`.
    // For now, we can leave it empty or define output to a different dir
    // to avoid conflict if someone runs `vite build`.
    // Or, more simply, ensure our `npm run build` uses esbuild and
    // `npm run dev` uses Vite's dev server.
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true, // Or remove to use production default
  },
  // Ensure Vitest can also use this config if needed, though Vitest has its own config usually.
  // For now, this is primarily for Vite's dev server and `vite build`.
};
