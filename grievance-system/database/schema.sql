CREATE DATABASE IF NOT EXISTS grievance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE grievance_db;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'customer',
  government_id VARCHAR(50) UNIQUE,
  department VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grievances (
  id VARCHAR(36) PRIMARY KEY,
  ticket_id VARCHAR(20) UNIQUE NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(20),
  order_id VARCHAR(50),
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  department VARCHAR(50),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'open',
  assigned_to VARCHAR(36),
  sentiment VARCHAR(20),
  ai_response TEXT,
  attachment_url TEXT,
  user_id VARCHAR(36),
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS grievance_updates (
  id VARCHAR(36) PRIMARY KEY,
  grievance_id VARCHAR(36),
  status VARCHAR(30),
  note TEXT,
  updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS internal_notes (
  id VARCHAR(36) PRIMARY KEY,
  grievance_id VARCHAR(36),
  note TEXT NOT NULL,
  author_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);
