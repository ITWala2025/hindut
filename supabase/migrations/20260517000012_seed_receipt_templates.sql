-- =============================================================================
-- Migration: 20260517000012_seed_receipt_templates.sql
-- Purpose : Seed the default receipt templates used by the Admin Portal.
--           Safe to re-run – uses ON CONFLICT DO NOTHING.
-- =============================================================================

insert into public.receipt_templates (id, name, body) values
  (
    'tmpl-membership',
    'Membership receipt',
    '<h1>Hindu Association of Ireland</h1>
<p>Receipt #{{receiptId}}</p>
<p>Dear {{recipientName}},</p>
<p>Thank you for your membership contribution of €{{amount}} received on {{date}}.</p>
<p>{{description}}</p>
<p>— Hindu Association of Ireland (CHY 12345)</p>'
  ),
  (
    'tmpl-donation',
    'Donation receipt',
    '<h1>Hindu Association of Ireland</h1>
<p>Receipt #{{receiptId}}</p>
<p>Dear {{recipientName}},</p>
<p>We gratefully acknowledge your donation of €{{amount}} on {{date}} towards "{{description}}".</p>
<p>This receipt may be used for tax purposes.</p>
<p>— Hindu Association of Ireland (CHY 12345)</p>'
  ),
  (
    'tmpl-event',
    'Event ticket receipt',
    '<h1>Hindu Association of Ireland</h1>
<p>Receipt #{{receiptId}}</p>
<p>Dear {{recipientName}},</p>
<p>Your purchase of €{{amount}} for "{{description}}" on {{date}} is confirmed.</p>
<p>Please bring this receipt or your email confirmation to the venue.</p>'
  )
on conflict (id) do nothing;
