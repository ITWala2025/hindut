import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Still copy tinymce for production (skins/content CSS loaded at runtime)
    viteStaticCopy({
      targets: [
        { src: 'node_modules/tinymce/skins', dest: 'tinymce' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Split CSS per chunk so unused styles aren't loaded on every page
    cssCodeSplit: true,
    // Enable compressed size reporting only locally (faster CI)
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Manual chunk splitting — only extract packages that have NO React
        // dependencies at module initialisation time.  Splitting React-dependent
        // packages (sonner, @tanstack/react-query, framer-motion, radix-ui, …)
        // away from React itself creates circular chunk load-order issues that
        // cause "Cannot read properties of undefined (reading 'createContext')"
        // at runtime. React + all React-using packages must load together.
        manualChunks: (id) => {
          if (!id.includes('node_modules/')) return

          // TinyMCE — 1.5 MB rich-text editor, admin only, zero React deps at init
          if (id.includes('/tinymce') || id.includes('/@tinymce/')) return 'vendor-tinymce'

          // D3 — pure data-visualisation, no React deps
          if (id.includes('/d3') || id.includes('/internmap') || id.includes('/robust-predicates')) return 'vendor-d3'

          // Stripe — payment SDK, no React deps
          if (id.includes('/@stripe/')) return 'vendor-stripe'

          // Everything else (React core, router, radix, framer-motion, tanstack,
          // sonner, …) stays in Vite's default chunking so load order is safe.
        },
        // Consistent hashed filenames for long-term asset caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
