/**
 * netlify/functions/rsvp-export.ts
 * Authenticated admin endpoint that decrypts RSVP data and returns a CSV download.
 * Requires a valid Supabase JWT in the Authorization header with admin role.
 *
 * Required Netlify environment variables:
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (bypasses RLS for decryption)
 *   RSVP_ENCRYPTION_KEY       — Same key used at insert time
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

function escapeCSV(value: unknown, forceText: boolean = false): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  
  // Force numeric-looking values (like phone numbers) to be treated as text
  // by prefixing with a single quote
  const isNumericLooking = /^\d+$/.test(str)
  const needsQuotePrefix = forceText || isNumericLooking
  
  let result = str
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    result = `"${str.replace(/"/g, '""')}"`
  }
  
  // If numeric-looking and not already quoted, add quote prefix
  if (needsQuotePrefix && !result.startsWith('"')) {
    result = `'${result}`
  }
  
  return result
}

export const handler: Handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const encKey      = process.env.RSVP_ENCRYPTION_KEY
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!encKey || encKey.length < 16 || !supabaseUrl || !serviceKey) {
    console.error('Missing env vars in rsvp-export')
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Server configuration error' }) }
  }

  try {
    // -- Verify caller's JWT and admin role
    const token = (event.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    if (!token) {
      return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ error: 'Unauthorised' }) }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws },
    })

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ error: 'Unauthorised' }) }
    }

    const { data: roleRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    // Fall back to JWT app_metadata.role if no user_roles row exists.
    const role: string | undefined =
      (roleRow?.role as string | undefined) ||
      (user.app_metadata?.role as string | undefined)
    if (!role) {
      return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: 'Forbidden' }) }
    }

    // super_admin bypasses permission lookup; admin/editor must have rsvps:view.
    if (role !== 'super_admin') {
      if (role !== 'admin' && role !== 'editor') {
        return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: 'Forbidden' }) }
      }
      const { data: permRow } = await supabaseAdmin
        .from('role_permissions')
        .select('permissions')
        .eq('role', role)
        .maybeSingle()
      const perms = (permRow?.permissions ?? {}) as Record<string, Record<string, boolean>>
      if (!perms.rsvps?.view) {
        return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: 'Permission denied: rsvps:view required' }) }
      }
    }

    // -- Parse filter params
    const body = JSON.parse(event.body ?? '{}') as {
      eventId?: string; fromDate?: string; toDate?: string; status?: string
    }

    console.log('Export request:', { eventId: body.eventId, fromDate: body.fromDate, toDate: body.toDate, status: body.status })

    // -- Fetch decrypted data via the secure Postgres function
    // Cast parameters to match function signature (uuid, date, date, text)
    const { data: rows, error: dbErr } = await supabaseAdmin.rpc('export_rsvps_decrypted', {
      p_enc_key:   encKey,
      p_event_id:  body.eventId ? body.eventId : null,  // String UUID or null
      p_from_date: body.fromDate ? body.fromDate : null,  // YYYY-MM-DD string or null
      p_to_date:   body.toDate ? body.toDate : null,  // YYYY-MM-DD string or null
      p_status:    body.status ?? null,
    })

    if (dbErr) {
      console.error('export_rsvps_decrypted error:', dbErr.message, dbErr.details, dbErr.hint)
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: `Database error: ${dbErr.message}` }) }
    }

    if (!rows || !Array.isArray(rows)) {
      console.warn('export_rsvps_decrypted returned non-array:', typeof rows, rows)
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid response from database' }) }
    }

    // -- Build CSV
    const csvHeaders = [
      'Reference', 'Event', 'First Name', 'Last Name',
      'Phone', 'Email', 'Adults', 'Children',
      'Status', 'Confirmation Sent', 'Submitted At',
    ]

    const csvRows = (rows ?? []).map((r: Record<string, unknown>) => {
      const values = [
        r.reference_number,
        r.event_title,
        r.first_name,
        r.last_name,
        r.phone,
        r.email,
        r.num_adults,
        r.num_children,
        r.status,
        r.confirmation_sent_at ? new Date(r.confirmation_sent_at as string).toISOString() : '',
        new Date(r.created_at as string).toISOString(),
      ]
      
      // Force phone (index 4) and email (index 5) to be treated as text
      const textForceFields = new Set([4, 5])
      
      return values
        .map((v, idx) => escapeCSV(v, textForceFields.has(idx)))
        .join(',')
    })

    const csv      = [csvHeaders.join(','), ...csvRows].join('\r\n')
    const filename = `rsvps-${new Date().toISOString().slice(0, 10)}.csv`

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: csv,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    // Extract only the first line of error message (avoid showing code snippets)
    const cleanMsg = errorMsg.split('\n')[0]
    console.error('Unhandled error in rsvp-export:', errorMsg, err)
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: cleanMsg }) }
  }
}
