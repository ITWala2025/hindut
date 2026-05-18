/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

// CSS imported as raw strings via Vite's ?raw query (no CSS processing)
declare module '*.css?raw' {
  const content: string
  export default content
}