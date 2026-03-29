-- ============================================================
-- Engineering Residuals Migration
-- Run: mysql -u root -p grievance_db < migration_engineering_residuals.sql
-- ============================================================

USE grievance_db;

-- 1. Add geospatial columns for deduplication
ALTER TABLE grievances
  ADD COLUMN latitude DECIMAL(10,8) DEFAULT NULL AFTER attachment_url,
  ADD COLUMN longitude DECIMAL(11,8) DEFAULT NULL AFTER latitude;

-- 2. Add perceptual image hash for near-duplicate detection
ALTER TABLE grievances
  ADD COLUMN image_hash VARCHAR(64) DEFAULT NULL AFTER longitude;

-- 3. Add upvote counter (replaces ad-hoc upvotes column if exists)
ALTER TABLE grievances
  ADD COLUMN upvote_count INT DEFAULT 0 AFTER image_hash;

-- 4. Add computed priority score P ∈ [0, 100]
ALTER TABLE grievances
  ADD COLUMN priority_score DECIMAL(5,2) DEFAULT NULL AFTER upvote_count;

-- 5. Add spatial index for fast radius queries
ALTER TABLE grievances
  ADD INDEX idx_geo (latitude, longitude);

-- 6. Add index for priority score sorting (Admin Dashboard "True Impact")
ALTER TABLE grievances
  ADD INDEX idx_priority_score (priority_score DESC);

-- 7. Linking table: tracks which users upvoted via dedup merge
CREATE TABLE IF NOT EXISTS grievance_upvoters (
  id VARCHAR(36) PRIMARY KEY,
  grievance_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_grievance_user (grievance_id, user_id)
);
