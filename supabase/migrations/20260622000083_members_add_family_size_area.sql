-- Migration: 20260622000083_members_add_family_size_area.sql
-- Purpose : Add family_size and area columns to the members table for community data capture.

alter table public.members
  add column if not exists family_size text,
  add column if not exists area        text;
