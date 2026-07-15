/**
 * netlify/functions/weekly-digest.ts
 *
 * Netlify Scheduled Function — runs every Monday morning and emails the
 * organisation a summary of the previous 7 days' activity (new members,
 * donations received, upcoming events), if Admin → Settings →
 * Notifications → "Weekly digest" is enabled.
 *
 * Schedule: 08:00 UTC every Monday ("Monday-morning summary").
 * Note: Netlify Scheduled Functions only run on deployed (production/branch)
 * sites, not in local dev.
 */

import { schedule } from '@netlify/functions'
import { supabaseAdmin } from './lib/stripe.js'
import { notifyAdmin } from './lib/notifications.js'

async function run() {
  const supabase = supabaseAdmin()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: newMembers }, { data: donationRows }, { count: upcomingEvents }] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).gte('joined_at', since),
    supabase.from('donations').select('amount_eur').eq('status', 'succeeded').gte('created_at', since),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('published', true).gte('start_date', new Date().toISOString()),
  ])

  const donations = (donationRows as { amount_eur: number }[] | null) ?? []
  const donationTotal = donations.reduce((sum, d) => sum + (d.amount_eur ?? 0), 0)
  const donationCount = donations.length

  const html = `
    <p>Here's what happened on the Hindu Association of Ireland website in the last 7 days:</p>
    <ul>
      <li><strong>${newMembers ?? 0}</strong> new member${(newMembers ?? 0) === 1 ? '' : 's'} joined</li>
      <li><strong>${donationCount}</strong> donation${donationCount === 1 ? '' : 's'} received, totalling <strong>€${donationTotal.toFixed(2)}</strong></li>
      <li><strong>${upcomingEvents ?? 0}</strong> upcoming published event${(upcomingEvents ?? 0) === 1 ? '' : 's'}</li>
    </ul>
  `.trim()
  const text =
    `Weekly digest:\n` +
    `- ${newMembers ?? 0} new member(s) joined\n` +
    `- ${donationCount} donation(s) received, totalling €${donationTotal.toFixed(2)}\n` +
    `- ${upcomingEvents ?? 0} upcoming published event(s)\n`

  const sent = await notifyAdmin('weeklyDigest', {
    subject: 'Weekly digest — Hindu Association of Ireland',
    html,
    text,
  })
  console.log('[weekly-digest] run complete, email sent:', sent)
}

export const handler = schedule('0 8 * * 1', async () => {
  try {
    await run()
  } catch (err) {
    console.error('[weekly-digest] error:', err)
  }
  return { statusCode: 200 }
})
