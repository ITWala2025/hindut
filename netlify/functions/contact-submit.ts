/**
 * netlify/functions/contact-submit.ts
 *
 * Handles contact form submissions:
 *   1. Server-side validation.
 *   2. Sanitisation to prevent XSS / injection attacks.
 *   3. Sends confirmation email to visitor via Zoho SMTP.
 *   4. Sends admin notification to organization email.
 *
 * Required Netlify environment variables:
 *   SMTP_HOST       — Zoho SMTP host (e.g., smtp.zoho.com / smtp.zoho.eu)
 *   SMTP_PORT       — SMTP port (587 for STARTTLS, 465 for SSL)
 *   SMTP_SECURE     — "true" for port 465, "false" for 587
 *   SMTP_USER       — Email account username (e.g., donation@hindutemple.ie)
 *   SMTP_PASS       — Email account password / app password
 *   EMAIL_FROM_DONATION — Display FROM address, e.g. "HAI Donations <donation@hindutemple.ie>"
 *   CONTACT_ADMIN_EMAIL — Admin email to receive form submissions (e.g., info@hindutemple.ie)
 *   URL             — Site URL for email links (auto-populated by Netlify)
 */

import type { Handler } from '@netlify/functions'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import {
  buildVisitorConfirmationHtml,
  buildVisitorConfirmationText,
  buildAdminNotificationHtml,
  buildAdminNotificationText,
} from './lib/contactEmailTemplate'

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ContactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().default(''),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
})

type ContactFormData = z.infer<typeof ContactFormSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Sanitise text to prevent XSS attacks while preserving readability
 */
function sanitiseText(s: string): string {
  if (!s) return ''
  return s
    .trim()
    .replace(/[<>]/g, (c) => ({'<': '&lt;', '>': '&gt;'}[c] ?? c))
    .slice(0, 5000) // Cap at 5000 chars
}

/**
 * SMTP transporter configured for Zoho email
 */
function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    const missing = []
    if (!host) missing.push('SMTP_HOST')
    if (!user) missing.push('SMTP_USER')
    if (!pass) missing.push('SMTP_PASS')
    throw new Error(
      `Missing required SMTP configuration: ${missing.join(', ')}`
    )
  }

  console.log('[contact-submit] Creating SMTP transporter with:', {
    host,
    port,
    secure,
    user: user ? `${user.substring(0, 3)}...` : 'undefined',
  })

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    pool: {
      maxConnections: 1,
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    // Parse and validate request body
    let body: unknown
    try {
      body = JSON.parse(event.body || '{}')
    } catch (_) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON' }),
      }
    }

    // Validate schema
    let data: ContactFormData
    try {
      data = ContactFormSchema.parse(body)
    } catch (err) {
      const zodError = err as z.ZodError
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Validation failed',
          details: zodError.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        }),
      }
    }

    // Sanitise inputs
    const sanitisedData: ContactFormData = {
      name: sanitiseText(data.name),
      email: data.email.toLowerCase().trim(),
      phone: data.phone ? sanitiseText(data.phone) : '',
      subject: sanitiseText(data.subject),
      message: sanitiseText(data.message),
    }

    // Check SMTP configuration
    const adminEmail = process.env.CONTACT_ADMIN_EMAIL
    if (!adminEmail) {
      console.error('[contact-submit] CONTACT_ADMIN_EMAIL not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Server configuration error',
        }),
      }
    }

    // Prepare email parameters
    const emailParams = {
      visitorName: sanitisedData.name,
      visitorEmail: sanitisedData.email,
      visitorPhone: sanitisedData.phone,
      subject: sanitisedData.subject,
      message: sanitisedData.message,
      submittedAt: new Date().toISOString(),
    }

    // Create transporter and send emails
    if (process.env.SMTP_HOST) {
      try {
        const transporter = createTransporter()
        
        console.log('[contact-submit] Testing SMTP connection...', {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
        })

        // Test connection
        try {
          await transporter.verify()
          console.log('[contact-submit] ✅ SMTP connection verified successfully')
        } catch (verifyErr) {
          const verifyMessage = verifyErr instanceof Error ? verifyErr.message : String(verifyErr)
          console.error('[contact-submit] ❌ SMTP verification failed:', verifyMessage)
          throw new Error(`SMTP connection failed: ${verifyMessage}. Check credentials and network connectivity.`)
        }

        // Send confirmation email to visitor
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM_DONATION ?? process.env.EMAIL_FROM ?? `"Hindu Association of Ireland" <${process.env.SMTP_USER}>`,
            to: sanitisedData.email,
            subject: 'We received your message – Hindu Association of Ireland',
            html: buildVisitorConfirmationHtml(emailParams),
            text: buildVisitorConfirmationText(emailParams),
            replyTo: adminEmail,
          })
          console.log('[contact-submit] ✅ Confirmation email sent to', sanitisedData.email)
        } catch (confirmErr) {
          const confirmMessage = confirmErr instanceof Error ? confirmErr.message : String(confirmErr)
          console.error('[contact-submit] ❌ Failed to send confirmation email:', confirmMessage)
          throw new Error(`Failed to send confirmation email to ${sanitisedData.email}: ${confirmMessage}`)
        }

        // Send admin notification
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM_DONATION ?? process.env.EMAIL_FROM ?? `"Hindu Association of Ireland" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `New Contact Form Submission from ${sanitisedData.name}`,
            html: buildAdminNotificationHtml(emailParams),
            text: buildAdminNotificationText(emailParams),
            replyTo: sanitisedData.email,
          })
          console.log('[contact-submit] ✅ Admin notification sent to', adminEmail)
        } catch (adminErr) {
          const adminMessage = adminErr instanceof Error ? adminErr.message : String(adminErr)
          console.error('[contact-submit] ❌ Failed to send admin notification:', adminMessage)
          throw new Error(`Failed to send admin notification to ${adminEmail}: ${adminMessage}`)
        }
      } catch (emailErr) {
        const errorMessage = emailErr instanceof Error ? emailErr.message : String(emailErr)
        const errorCode = emailErr instanceof Error && 'code' in emailErr ? (emailErr as any).code : 'UNKNOWN'
        
        console.error('[contact-submit] Email error:', {
          message: errorMessage,
          code: errorCode,
          stack: emailErr instanceof Error ? emailErr.stack : undefined,
        })
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed to send email',
            details: errorMessage,
            errorCode: errorCode,
            timestamp: new Date().toISOString(),
          }),
        }
      }
    } else {
      console.warn('[contact-submit] SMTP_HOST not set — skipping email')
    }

    // Success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Your message has been received. We will respond shortly.',
        reference: `CONTACT-${Date.now()}`,
      }),
    }
  } catch (err) {
    console.error('[contact-submit] Unexpected error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    }
  }
}
