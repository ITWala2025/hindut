/**
 * netlify/functions/lib/mailer.ts
 *
 * Sends email via Microsoft Graph API (Exchange Online).
 * Uses OAuth2 client-credentials flow — no SMTP required.
 *
 * Required environment variables:
 *   AZURE_TENANT_ID      — Azure AD Directory (tenant) ID
 *   AZURE_CLIENT_ID      — App registration Application (client) ID
 *   AZURE_CLIENT_SECRET  — App registration client secret value
 *   MAIL_FROM_ADDRESS    — Sending mailbox UPN (e.g. info@hindutemple.ie)
 *                          The app registration must have the
 *                          Mail.Send *application* permission granted.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface MailAttachment {
  filename:    string
  content:     string | Buffer
  contentType?: string
  /** Set true to embed as a CID inline image (bypasses Outlook image blocking). */
  isInline?:   boolean
  /** Content-ID referenced in HTML as src="cid:<contentId>". */
  contentId?:  string
}

/** CID used for the HAI logo in all transactional emails. */
export const LOGO_CID = 'email-logo@hai'

export interface MailMessage {
  /** Display FROM address — e.g. '"HAI Donations" <info@hindutemple.ie>' */
  from?:        string
  to:           string | string[]
  subject:      string
  html?:        string
  text?:        string
  replyTo?:     string
  attachments?: MailAttachment[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Parse "Display Name <email>" or plain "email" into parts. */
function parseAddress(addr: string): { name: string; address: string } {
  const m = addr.match(/^"?([^"<]*)"?\s*<([^>]+)>$/)
  if (m) return { name: m[1].trim(), address: m[2].trim() }
  return { name: '', address: addr.trim() }
}

/** Fetch a short-lived access token from Azure AD using client credentials. */
async function getAccessToken(): Promise<string> {
  const tenantId     = process.env.AZURE_TENANT_ID
  const clientId     = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    const missing: string[] = []
    if (!tenantId)     missing.push('AZURE_TENANT_ID')
    if (!clientId)     missing.push('AZURE_CLIENT_ID')
    if (!clientSecret) missing.push('AZURE_CLIENT_SECRET')
    throw new Error(`Graph API mail: missing env vars — ${missing.join(', ')}`)
  }

  const resp = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'https://graph.microsoft.com/.default',
        grant_type:    'client_credentials',
      }),
    },
  )

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Graph API token request failed (${resp.status}): ${body}`)
  }

  const data = (await resp.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Graph API token response missing access_token')
  return data.access_token
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true when all four required environment variables are present.
 * Use this as the feature-flag guard (replaces the old `process.env.SMTP_HOST` check).
 */
export function isMailConfigured(): boolean {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.MAIL_FROM_ADDRESS
  )
}

/**
 * Send an email via Microsoft Graph API.
 * The actual sending mailbox is always MAIL_FROM_ADDRESS; the `from` field
 * in the message is used only for the display name shown to recipients.
 */
export async function sendMail(msg: MailMessage): Promise<void> {
  const fromAddress = process.env.MAIL_FROM_ADDRESS
  if (!fromAddress) throw new Error('MAIL_FROM_ADDRESS is not set')

  const token = await getAccessToken()

  // Display name: prefer what the caller passed in `from`, fall back to address.
  const fromParsed  = msg.from ? parseAddress(msg.from) : { name: '', address: fromAddress }
  const displayName = fromParsed.name || fromParsed.address || fromAddress

  // Recipients
  const toList = Array.isArray(msg.to) ? msg.to : [msg.to]
  const toRecipients = toList.map((addr) => {
    const p = parseAddress(addr)
    return { emailAddress: { address: p.address, name: p.name || p.address } }
  })

  // Attachments (e.g. ICS calendar files)
  const attachments: Array<Record<string, unknown>> = (msg.attachments ?? []).map((att) => {
    const bytes = Buffer.isBuffer(att.content)
      ? att.content
      : Buffer.from(att.content as string)
    const obj: Record<string, unknown> = {
      '@odata.type':  '#microsoft.graph.fileAttachment',
      name:           att.filename,
      contentType:    att.contentType ?? 'application/octet-stream',
      contentBytes:   bytes.toString('base64'),
    }
    if (att.isInline)   obj.isInline   = true
    if (att.contentId)  obj.contentId  = att.contentId
    return obj
  })

  // Auto-inject HAI logo as a CID inline attachment whenever the HTML
  // references cid:email-logo@hai — works without changes in any caller.
  if (msg.html?.includes(`cid:${LOGO_CID}`)) {
    try {
      const logoBytes = readFileSync(join(__dirname, 'email-logo.jpg'))
      attachments.unshift({
        '@odata.type':  '#microsoft.graph.fileAttachment',
        name:           'email-logo.jpg',
        contentType:    'image/jpeg',
        contentBytes:   logoBytes.toString('base64'),
        isInline:       true,
        contentId:      LOGO_CID,
      })
    } catch {
      // Logo file not found — gracefully degrade (alt text shown instead)
    }
  }

  // Graph API message payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message: Record<string, any> = {
    subject: msg.subject,
    from: {
      emailAddress: { address: fromAddress, name: displayName },
    },
    toRecipients,
    body: {
      contentType: msg.html ? 'HTML' : 'Text',
      content:     msg.html ?? msg.text ?? '',
    },
  }

  if (msg.replyTo) {
    const rp = parseAddress(msg.replyTo)
    message.replyTo = [{ emailAddress: { address: rp.address, name: rp.name || rp.address } }]
  }

  if (attachments.length > 0) {
    message.attachments = attachments
  }

  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}/sendMail`,
    {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, saveToSentItems: false }),
    },
  )

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Graph API sendMail failed (${resp.status}): ${body}`)
  }
}
