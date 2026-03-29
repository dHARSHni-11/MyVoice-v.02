-- ============================================================
-- Geocoding & NLP Triage Migration
-- Run: mysql -u root -p grievance_db < migration_geocoding_triage.sql
-- ============================================================

USE grievance_db;

-- 1. Add geocoded location columns for enriched address data
ALTER TABLE grievances
  ADD COLUMN IF NOT EXISTS district VARCHAR(100) DEFAULT NULL AFTER longitude,
  ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT NULL AFTER district,
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL AFTER state;

-- 2. Add index for district-level filtering / aggregation
ALTER TABLE grievances
  ADD INDEX idx_district (district);

-- 3. Add index for state-level filtering
ALTER TABLE grievances
  ADD INDEX idx_state (state);
