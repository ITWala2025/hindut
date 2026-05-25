/**
 * SEO utilities for the Hindu Association of Ireland website.
 *
 * Uses React 19's native document-metadata hoisting — no extra library needed.
 * `<title>`, `<meta>`, and `<link>` rendered inside any component are
 * automatically moved to `<head>` and cleaned up on unmount.
 *
 * JSON-LD `<script>` tags are rendered inline in the component tree (body).
 * Google + Bing both support JSON-LD placement anywhere in the document.
 */

const SITE_NAME = 'Hindu Association of Ireland'
const SITE_DOMAIN = 'https://www.hindutemple.ie'
const DEFAULT_OG_IMAGE = `${SITE_DOMAIN}/logo.webp`

export interface SeoMetaProps {
  /** Page-level title — will be appended with "| Hindu Association of Ireland" */
  title: string
  /** Page meta description — keep under 160 chars */
  description: string
  /** Relative canonical path, e.g. "/about". Omit for the home page (already set in index.html). */
  canonical?: string
  /** Relative or absolute OG image URL. Defaults to the site logo. */
  ogImage?: string
  /** Set true for admin, success, and private pages to block indexing. */
  noIndex?: boolean
  /** Optional JSON-LD schema object(s) to embed in the page. */
  schema?: Record<string, unknown> | Record<string, unknown>[]
}

export function SeoMeta({
  title,
  description,
  canonical,
  ogImage,
  noIndex = false,
  schema,
}: SeoMetaProps) {
  const fullTitle = `${title} | ${SITE_NAME}`
  const canonicalUrl = canonical ? `${SITE_DOMAIN}${canonical}` : undefined
  const imageUrl = ogImage
    ? ogImage.startsWith('http') ? ogImage : `${SITE_DOMAIN}${ogImage}`
    : DEFAULT_OG_IMAGE

  const schemas = schema
    ? Array.isArray(schema) ? schema : [schema]
    : []

  return (
    <>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={
          noIndex
            ? 'noindex,nofollow'
            : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'
        }
      />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:locale" content="en_IE" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* JSON-LD structured data (renders in body — valid per Google/Bing spec) */}
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </>
  )
}

// ── Shared schema builders ────────────────────────────────────────────────────

export const ORG_REF = { '@id': `${SITE_DOMAIN}/#organization` }

export function webPageSchema(
  name: string,
  description: string,
  path: string,
  type = 'WebPage',
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${SITE_DOMAIN}${path}#webpage`,
    name,
    description,
    url: `${SITE_DOMAIN}${path}`,
    isPartOf: { '@id': `${SITE_DOMAIN}/#website` },
    publisher: ORG_REF,
  }
}

export function breadcrumbSchema(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_DOMAIN}${item.path}`,
    })),
  }
}

export function eventSchema(event: {
  name: string
  description: string
  startDate: string
  endDate?: string
  location: string
  url?: string
  image?: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Limerick',
        addressCountry: 'IE',
      },
    },
    organizer: ORG_REF,
    ...(event.image ? { image: event.image } : {}),
    ...(event.url ? { url: event.url } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  }
}
