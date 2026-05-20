-- Remove legacy [cs:...] suffix that was erroneously appended to donation
-- descriptions by an earlier version of create-checkout-session.ts.
-- Pattern: optional leading space + [cs: + anything up to closing bracket]
UPDATE donations
SET description = trim(regexp_replace(description, '\s*\[cs:[^\]]*\]', '', 'g'))
WHERE description LIKE '%[cs:%';
