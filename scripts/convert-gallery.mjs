#!/usr/bin/env node
/**
 * Converts every image in /public/images/Gallery to .webp and writes
 * a manifest at /src/data/galleryManifest.json that the gallery component
 * imports to discover images without hardcoding filenames.
 *
 * Re-running is safe: existing .webp files are only regenerated if their
 * source is newer.
 */
import { readdir, stat, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const GALLERY_SRC = join(ROOT, 'public', 'images', 'Gallery')
const GALLERY_OUT = join(ROOT, 'public', 'images', 'gallery-webp')
const MANIFEST_OUT = join(ROOT, 'src', 'data', 'galleryManifest.json')

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.webp'])

async function main() {
  if (!existsSync(GALLERY_SRC)) {
    console.warn(`[gallery] Source folder not found: ${GALLERY_SRC}`)
    await writeFile(MANIFEST_OUT, JSON.stringify({ images: [] }, null, 2))
    return
  }

  await mkdir(GALLERY_OUT, { recursive: true })

  const entries = await readdir(GALLERY_SRC)
  const images = []

  for (const file of entries) {
    const ext = parse(file).ext.toLowerCase()
    if (!SUPPORTED.has(ext)) continue

    const srcPath = join(GALLERY_SRC, file)
    const safeName = parse(file).name.replace(/[^\w.-]+/g, '_')
    const outName = `${safeName}.webp`
    const outPath = join(GALLERY_OUT, outName)

    const srcStat = await stat(srcPath)
    const needsBuild =
      !existsSync(outPath) || (await stat(outPath)).mtimeMs < srcStat.mtimeMs

    if (needsBuild) {
      const pipeline = sharp(srcPath, { failOn: 'none' })
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })

      const { width, height } = await pipeline
        .clone()
        .toFile(outPath)
        .then(async (info) => ({ width: info.width, height: info.height }))

      images.push({
        src: `/images/gallery-webp/${outName}`,
        width,
        height,
        alt: parse(file).name.replace(/[_-]+/g, ' '),
      })
      console.log(`[gallery] ✓ ${file} → ${outName} (${width}×${height})`)
    } else {
      const meta = await sharp(outPath).metadata()
      images.push({
        src: `/images/gallery-webp/${outName}`,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        alt: parse(file).name.replace(/[_-]+/g, ' '),
      })
      console.log(`[gallery] ↻ cached ${outName}`)
    }
  }

  await mkdir(dirname(MANIFEST_OUT), { recursive: true })
  await writeFile(
    MANIFEST_OUT,
    JSON.stringify({ images, generatedAt: new Date().toISOString() }, null, 2),
  )
  console.log(`[gallery] Wrote manifest with ${images.length} image(s)`)
}

main().catch((err) => {
  console.error('[gallery] Conversion failed:', err)
  process.exit(1)
})
