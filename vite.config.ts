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
});
