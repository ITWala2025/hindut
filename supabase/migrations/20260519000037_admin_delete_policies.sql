-- =============================================================================
-- Migration: 20260519000037_admin_delete_policies.sql
-- Purpose : Add admin DELETE policies for ticket_bookings so admins can
--           hard-delete records via the admin portal.
-- =============================================================================

-- ticket_bookings: admin hard-delete
drop policy if exists ticket_bookings_admin_delete on public.ticket_bookings;
create policy ticket_bookings_admin_delete on public.ticket_bookings
  for delete
  using (public.current_user_role() = 'admin');

-- Grant DELETE to authenticated (RLS will gate to admin role only)
grant delete on public.ticket_bookings to authenticated;
