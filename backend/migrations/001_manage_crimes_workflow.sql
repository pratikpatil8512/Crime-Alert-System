-- Manage Crimes workflow extensions (idempotent)
-- Run this on your Postgres/Supabase database.
--
-- Adds:
-- - assignment + archive fields on crime_data
-- - crime_notes: internal notes per crime
-- - crime_activity: timeline of actions for audit/UX

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crime_status') THEN
    BEGIN
      ALTER TYPE crime_status ADD VALUE IF NOT EXISTS 'unresolved';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 1) Extend crime_data
ALTER TABLE crime_data
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE crime_data
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_reason text;

-- Optional: basic priority support (kept simple for UI sorting)
ALTER TABLE crime_data
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_crime_data_status ON crime_data(status);
CREATE INDEX IF NOT EXISTS idx_crime_data_severity ON crime_data(severity);
CREATE INDEX IF NOT EXISTS idx_crime_data_assigned_to ON crime_data(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crime_data_archived_at ON crime_data(archived_at);
CREATE INDEX IF NOT EXISTS idx_crime_data_incident_time ON crime_data(incident_time DESC);

-- 2) Notes table
CREATE TABLE IF NOT EXISTS crime_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crime_id uuid NOT NULL REFERENCES crime_data(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crime_notes_crime_id_created_at
  ON crime_notes(crime_id, created_at DESC);

-- 3) Activity timeline table
CREATE TABLE IF NOT EXISTS crime_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crime_id uuid NOT NULL REFERENCES crime_data(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crime_activity_crime_id_created_at
  ON crime_activity(crime_id, created_at DESC);

