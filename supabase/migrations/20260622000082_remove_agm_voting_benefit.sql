-- Migration: 20260622000082_remove_agm_voting_benefit.sql
-- Purpose : Remove "Full AGM voting rights" from the annual membership plan benefits.

update public.membership_plans
set benefits = '["Monthly Nama-Nakshatra Archana","Annual special-occasion Archana","Karpaga Vriksham leaf entry","Community newsletter & event invitations","Annual report and tax receipt"]'
where id = 'annual';
