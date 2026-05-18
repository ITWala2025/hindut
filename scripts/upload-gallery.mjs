#!/usr/bin/env node
/**
 * One-time (idempotent) script to upload every image from
 * public/images/Gallery/ into the Supabase `public-gallery` storage bucket
 * and register its metadata in the `public.media` table.
 *
 * Usage:
 *   node scripts/upload-gallery.mjs
 *
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, parse, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')

// ── Load .env manually (no external deps needed) ───────────────────────────
const envText = await readFile(join(ROOT, '.env'), 'utf8').catch(() => '')
const env = Object.fromEntries(
  envText.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      const key = l.slice(0, idx).trim()
      const val = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      return [key, val]
    })
)

const SUPABASE_URL      = env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[upload-gallery] ERROR: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const GALLERY_SRC = join(ROOT, 'public', 'images', 'Gallery')
const BUCKET      = 'public-gallery'
const FOLDER      = 'gallery'

const MIME = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
}
const SUPPORTED = new Set(Object.keys(MIME))

// ── Main ────────────────────────────────────────────────────────────────────
let uploaded = 0
let skipped  = 0
let failed   = 0

const entries = await readdir(GALLERY_SRC).catch(() => [])
if (entries.length === 0) {
  console.warn('[upload-gallery] Gallery folder is empty or not found:', GALLERY_SRC)
  process.exit(0)
}

console.log(`[upload-gallery] Found ${entries.length} file(s) in ${GALLERY_SRC}\n`)

for (const filename of entries) {
  const ext = parse(filename).ext.toLowerCase()
  if (!SUPPORTED.has(ext)) {
    console.log(`[upload-gallery] ✗ skipping (unsupported): ${filename}`)
    continue
  }

  // Sanitise filename for storage path
  const safeName    = filename.replace(/[^\w.\-]+/g, '_').replace(/_{2,}/g, '_')
  const storagePath = `${FOLDER}/${safeName}`
  const contentType = MIME[ext]

  // Check if already in DB (idempotent)
  const { data: existing } = await supabase
    .from('media')
    .select('id')
    .eq('bucket', BUCKET)
    .eq('path', storagePath)
    .maybeSingle()

  if (existing) {
    console.log(`[upload-gallery] ✓ already exists — skipping: ${filename}`)
    skipped++
    continue
  }

  // Read file
  const fileBuffer = await readFile(join(GALLERY_SRC, filename))
  const sizeKb     = Math.round(fileBuffer.byteLength / 1024)

  // Upload to Supabase Storage
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: false })

  if (upErr && upErr.message !== 'The resource already exists') {
    console.error(`[upload-gallery] ✗ storage upload failed: ${filename} — ${upErr.message}`)
    failed++
    continue
  }

  // Build a human-readable title from the filename
  const rawName = parse(filename).name
  const title   = rawName
    .replace(/[_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Insert metadata row
  const { error: insertErr } = await supabase.from('media').insert({
    bucket:      BUCKET,
    path:        storagePath,
    filename:    filename,
    folder:      FOLDER,
    size_kb:     sizeKb,
    title:       title,
    alt_text:    `Gallery image: ${title}`,
  })

  if (insertErr) {
    console.error(`[upload-gallery] ✗ metadata insert failed: ${filename} — ${insertErr.message}`)
    // Rollback the storage upload so DB and storage stay in sync
    await supabase.storage.from(BUCKET).remove([storagePath])
    failed++
    continue
  }

  console.log(`[upload-gallery] ↑ uploaded: ${filename} (${sizeKb} KB)`)
  uploaded++
}

console.log(`
[upload-gallery] ─────────────────────────────────
  Uploaded : ${uploaded}
  Skipped  : ${skipped} (already in DB)
  Failed   : ${failed}
[upload-gallery] ─────────────────────────────────`)
