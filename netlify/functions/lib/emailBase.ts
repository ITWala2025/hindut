/**
 * netlify/functions/lib/emailBase.ts
 *
 * Shared branding helpers for all transactional email templates.
 * Provides the HAI logo banner, favicon trust seal, and site URL helper
 * so every email looks consistent without duplicating markup.
 */

/** Absolute base URL of the deployed site (no trailing slash). */
export function getSiteUrl(): string {
  return (process.env.URL ?? 'https://limerickhindutemple.netlify.app').replace(/\/$/, '')
}

/** Public URL of the HAI green logo served from /public. */
export function getLogoUrl(): string {
  return `${getSiteUrl()}/${encodeURIComponent('HAI (Green)  Hindu Association Ireland logo-01.jpg')}`
}

/** Public URL of the favicon — used as a visual trust seal in email footers. */
export function getFaviconUrl(): string {
  return `${getSiteUrl()}/favicon.png`
}

/**
 * Returns a <tr> block that renders the HAI logo in a white banner above
 * the gradient header.  Insert this as the FIRST row inside the card <table>.
 */
export function logoRow(): string {
  return `
        <!-- ═══════════════════════ LOGO BANNER ═══════════════════════════ -->
        <tr>
          <td style="background:#ffffff;padding:18px 40px 14px;text-align:center;
                     border-bottom:2px solid #fff7ed;">
            <img src="${getLogoUrl()}"
                 alt="Hindu Association of Ireland"
                 width="160"
                 style="height:auto;max-height:72px;width:auto;max-width:200px;
                        display:block;margin:0 auto;"
            />
          </td>
        </tr>`
}

/**
 * Returns the inner HTML for a footer <td>.
 * Renders a small favicon trust seal followed by standard legal text.
 */
export function footerInner(opts: { mainText: string; subText?: string }): string {
  return `
          <!-- Favicon trust seal -->
          <div style="margin:0 0 12px;">
            <img src="${getFaviconUrl()}"
                 alt="" width="22" height="22"
                 style="display:inline-block;vertical-align:middle;border-radius:4px;
                        margin-right:7px;opacity:0.85;" />
            <span style="font-size:12px;font-weight:700;color:#92400e;
                          font-family:Arial,sans-serif;vertical-align:middle;
                          letter-spacing:0.3px;">
              Hindu Association of Ireland
            </span>
          </div>
          <p style="margin:0;font-size:11px;color:#a8a29e;font-family:Arial,sans-serif;">
            ${opts.mainText}
          </p>
          ${opts.subText
            ? `<p style="margin:6px 0 0;font-size:11px;color:#d6d3d1;font-family:Arial,sans-serif;">${opts.subText}</p>`
            : ''
          }`
}
