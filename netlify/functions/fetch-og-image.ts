/**
 * netlify/functions/fetch-og-image.ts
 *
 * Given a public album URL (Google Photos, Flickr, etc.), fetches the page
 * server-side (bypassing browser CORS) and returns the og:image URL found
 * in the page's <meta> tags.
 *
 * Query params:
 *   url — the album page URL to inspect (required)
 *
 * Response:
 *   200  { thumbnail: string }      — og:image found
 *   204  (no body)                  — page fetched but no og:image found
 *   400  { error: string }          — bad / missing URL
 *   500  { error: string }          — upstream fetch failed
 */

import type { Handler } from '@netlify/functions'

// Block SSRF targets: loopback, link-local, private ranges
const BLOCKED_HOSTS = /^(localhost|127\.|0\.|::1|169\.254\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i

function isSafeUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw)
    if (protocol !== 'http:' && protocol !== 'https:') return false
    if (BLOCKED_HOSTS.test(hostname)) return false
    return true
  } catch {
    return false
  }
}

/** Extract the content of the first og:image (or twitter:image) meta tag. */
function extractOgImage(html: string): string | null {
  // Match <meta property="og:image" content="..."> in any attribute order
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)

  if (match?.[1]) return match[1]

  // Fallback: first lh3.googleusercontent.com image URL (Google Photos CDN)
  const lh3 = html.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>\\]+/)
  return lh3?.[0] ?? null
}

const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url ?? ''

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing url parameter' }) }
  }

  if (!isSafeUrl(url)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or disallowed URL' }) }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        // Disable compression so we get raw text bytes
        'Accept-Encoding': 'identity',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `Upstream returned ${response.status}` }),
      }
    }

    // Stream the response and stop as soon as we have enough content to
    // find the og:image.  Google Photos buries it ~950 KB in, so we read up
    // to 1.5 MB but bail out early the moment we find a candidate URL.
    const reader = response.body?.getReader()
    if (!reader) return { statusCode: 204 }

    const decoder = new TextDecoder()
    let html = ''
    const MAX_BYTES = 1_500_000

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      // Early exit: we have enough context once we've seen og:image AND a lh3 URL
      if (html.includes('og:image') && html.includes('lh3.googleusercontent.com')) break
    }
    reader.cancel().catch(() => { /* ignore */ })

    const thumbnail = extractOgImage(html)

    if (!thumbnail) {
      return { statusCode: 204 }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbnail }),
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { statusCode: 500, body: JSON.stringify({ error: message }) }
  }
}

export { handler }
