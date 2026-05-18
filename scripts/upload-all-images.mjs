#!/usr/bin/env node
/**
 * upload-all-images.mjs
 *
 * Uploads every remaining image from public/images/ to Supabase Storage
 * and keeps the `public.media` table in sync.
 *
 * What it does:
 *   1. gallery-webp/*.webp  → bucket public-gallery / path gallery-webp/{name}
 *      Then updates existing media rows (folder=gallery) to use the WebP path
 *      so the PhotoGallery component serves the lighter WebP versions.
 *
 *   2. public/images/*.png  → bucket public-gallery / path branding/{name}
 *      Upserts a media row with folder=general.
 *
 * Usage:
 *   node scripts/upload-all-images.mjs
 *
 * Idempotent — safe to re-run.
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, parse, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Load .env ─────────────────────────────────────────────────────────────────
const envText = await readFile(join(ROOT, '.env'), 'utf8').catch(() => '')
const env = Object.fromEntries(
  envText.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')]
    })
)

const SUPABASE_URL     = env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const BUCKET   = 'public-gallery'

const MIME = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
}

function publicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

async function uploadFile(localPath, storagePath, contentType) {
  const buf = await readFile(localPath)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, { contentType, upsert: true })
  if (error) throw new Error(error.message)
  return Math.round(buf.byteLength / 1024)
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. gallery-webp  →  upload + update existing media rows to WebP paths
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Step 1: gallery-webp WebP files ──────────────────────────────')
const WEBP_SRC = join(ROOT, 'public', 'images', 'gallery-webp')
const webpFiles = (await readdir(WEBP_SRC).catch(() => []))
  .filter(f => f.toLowerCase().endsWith('.webp'))

console.log(`Found ${webpFiles.length} WebP file(s)`)

for (const filename of webpFiles) {
  const storagePath = `gallery-webp/${filename}`
  const localPath   = join(WEBP_SRC, filename)

  // Upload (upsert=true so re-runs are safe)
  try {
    const sizeKb = await uploadFile(localPath, storagePath, 'image/webp')
    console.log(`  ↑ uploaded: ${filename} (${sizeKb} KB)`)
  } catch (e) {
    console.error(`  ✗ storage upload failed: ${filename} — ${e.message}`)
    continue
  }

  // Find the matching gallery media row by filename stem
  // e.g.  DSC_0001.webp  ←→  gallery row with filename DSC_0001.JPG / DSC_0001.jpeg
  const stem = parse(filename).name.toLowerCase()

  const { data: rows } = await supabase
    .from('media')
    .select('id, path, filename')
    .eq('bucket', BUCKET)
    .eq('folder', 'gallery-webp')

  const match = (rows ?? []).find(r => {
    const rowStem = parse(r.filename ?? r.path).name
      .replace(/[^\w]/g, '_').replace(/_{2,}/g, '_').toLowerCase()
    const webpStem = stem.replace(/[^\w]/g, '_').replace(/_{2,}/g, '_').toLowerCase()
    return rowStem === webpStem
  })

  if (match) {
    const { error: upErr } = await supabase
      .from('media')
      .update({ path: storagePath, filename: filename })
      .eq('id', match.id)

    if (upErr) {
      console.error(`  ✗ media row update failed: ${filename} — ${upErr.message}`)
    } else {
      console.log(`  ✓ media row updated  (was: ${match.path}  →  ${storagePath})`)
    }
  } else {
    // No existing row — insert a new one
    const title = parse(filename).name.replace(/[_-]+/g, ' ').trim()
    const { error: insErr } = await supabase.from('media').insert({
      bucket:    BUCKET,
      path:      storagePath,
      filename:  filename,
      folder:    'gallery-webp',
      size_kb:   0,
      title,
      alt_text:  `Gallery image: ${title}`,
    })
    if (insErr) {
      console.error(`  ✗ media insert failed: ${filename} — ${insErr.message}`)
    } else {
      console.log(`  + media row inserted for: ${filename}`)
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Branding PNGs  →  upload + upsert media row
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Step 2: branding images ───────────────────────────────────────')
const BRANDING_SRC = join(ROOT, 'public', 'images')
const brandingFiles = (await readdir(BRANDING_SRC).catch(() => []))
  .filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(parse(f).ext.toLowerCase()))

console.log(`Found ${brandingFiles.length} branding file(s)`)

const brandingUrls = {}

for (const filename of brandingFiles) {
  const ext         = parse(filename).ext.toLowerCase()
  const contentType = MIME[ext] ?? 'image/png'
  // URL-safe storage path
  const safeName    = filename.replace(/[^\w.\-]+/g, '_').replace(/_{2,}/g, '_')
  const storagePath = `branding/${safeName}`
  const localPath   = join(BRANDING_SRC, filename)

  try {
    const sizeKb = await uploadFile(localPath, storagePath, contentType)
    console.log(`  ↑ uploaded: ${filename} (${sizeKb} KB)`)
  } catch (e) {
    console.error(`  ✗ storage upload failed: ${filename} — ${e.message}`)
    continue
  }

  const title = parse(filename).name.replace(/[_-]+/g, ' ').trim()

  const { error: upsErr } = await supabase.from('media').upsert(
    {
      bucket:    BUCKET,
      path:      storagePath,
      filename:  filename,
      folder:    'general',
      title,
      alt_text:  title,
    },
    { onConflict: 'bucket,path' }
  )

  if (upsErr) {
    console.error(`  ✗ media upsert failed: ${filename} — ${upsErr.message}`)
  } else {
    console.log(`  ✓ media row upserted for: ${filename}`)
    brandingUrls[filename] = publicUrl(storagePath)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Supabase public URLs for branding images ──────────────────────')
for (const [name, url] of Object.entries(brandingUrls)) {
  console.log(`  ${name}`)
  console.log(`    ${url}`)
}
console.log('\nDone.')
