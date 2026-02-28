-- =============================================================================
-- Migration: 20260302000002_fix_job_status_enum.sql
-- Fix for: ERROR 22P02 invalid input value for enum job_status_enum: "DRAFT"
--
-- Root cause: job_postings.status is typed as job_status_enum (not text + CHECK).
-- Migration 20260302000001 incorrectly tried to drop a CHECK constraint.
-- This migration adds the missing enum values idempotently.
-- =============================================================================

-- Add DRAFT value if not present
do $$ begin
  alter type job_status_enum add value 'DRAFT';
exception when duplicate_object then null;
end $$;

-- Add PAUSED value if not present
do $$ begin
  alter type job_status_enum add value 'PAUSED';
exception when duplicate_object then null;
end $$;

-- Add CLOSED value if not present
do $$ begin
  alter type job_status_enum add value 'CLOSED';
exception when duplicate_object then null;
end $$;

-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block that
-- has other DDL. If Supabase SQL editor wraps this in a transaction and
-- errors, run each DO block separately.

comment on type job_status_enum is
  'Job posting lifecycle: DRAFT (not public), ACTIVE (public on /jobs), '
  'PAUSED (hidden, re-publishable), CLOSED (archived), and any pre-existing values.';
