import sharp from 'sharp'
import { writeFileSync } from 'fs'

async function generateFavicon() {
  const RING_SIZE = 256   // full canvas
  const RING_PX = 10      // gold ring thickness
  const INNER = RING_SIZE - RING_PX * 2  // 236

  // Gold ring + white fill SVG base
  const ringBase = Buffer.from(
    `<svg width="${RING_SIZE}" height="${RING_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#fcd34d"/>
          <stop offset="40%"  stop-color="#f97316"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#fb923c" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- outer glow -->
      <circle cx="${RING_SIZE/2}" cy="${RING_SIZE/2}" r="${RING_SIZE/2}" fill="url(#glow)"/>
      <!-- gold ring -->
      <circle cx="${RING_SIZE/2}" cy="${RING_SIZE/2}" r="${RING_SIZE/2 - 1}" fill="url(#ring)"/>
      <!-- white inner fill -->
      <circle cx="${RING_SIZE/2}" cy="${RING_SIZE/2}" r="${INNER/2}" fill="white"/>
    </svg>`
  )

  // Circular clip mask for the logo
  const circleMask = Buffer.from(
    `<svg width="${INNER}" height="${INNER}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${INNER/2}" cy="${INNER/2}" r="${INNER/2}" fill="white"/>
    </svg>`
  )

  // Resize logo to inner circle size, maintain aspect ratio, white background
  const logoCircle = await sharp(
    'public/HAI (Green)  Hindu Association Ireland logo-01.jpg'
  )
    .resize(INNER, INNER, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // Composite logo onto ring base, centered
  const full = await sharp(ringBase)
    .composite([{ input: logoCircle, left: RING_PX, top: RING_PX }])
    .png()
    .toBuffer()

  // 64x64 favicon.png
  const favicon64 = await sharp(full).resize(64, 64).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync('public/favicon.png', favicon64)

  // 32x32 for ICO fallback
  const favicon32 = await sharp(full).resize(32, 32).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync('public/favicon-32.png', favicon32)

  // 180x180 apple-touch-icon
  const apple = await sharp(full).resize(180, 180).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync('public/apple-touch-icon.png', apple)

  console.log('Favicons generated: favicon.png (64), favicon-32.png (32), apple-touch-icon.png (180)')
}

generateFavicon().catch(err => { console.error(err); process.exit(1) })
