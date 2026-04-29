-- BH Market database schema
-- Structure only: no user data, listings, passwords, or seed rows are included.
-- Import this file into an empty MySQL database.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'client',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_profiles (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  address VARCHAR(255) NULL,
  phone VARCHAR(40) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_client_profiles_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_profiles (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  matricule VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_agent_profiles_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_profiles (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_admin_profiles_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS raw_properties (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title TEXT NULL,
  price VARCHAR(255) NULL,
  location VARCHAR(255) NULL,
  description LONGTEXT NULL,
  image TEXT NULL,
  url TEXT NOT NULL,
  source VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  listing_id VARCHAR(128) NULL,
  stream VARCHAR(32) NULL,
  extra_json LONGTEXT NULL,
  first_seen_at DATETIME NULL,
  last_seen_at DATETIME NULL,
  last_crawled_at DATETIME NULL,
  processed TINYINT NOT NULL DEFAULT 0,
  scraped_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_raw_properties_source_url (source, url(255)),
  KEY idx_raw_properties_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clean_listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  raw_id BIGINT NULL,
  source VARCHAR(120) NULL,
  title VARCHAR(255) NULL,
  normalized_title TEXT NULL,
  price_raw VARCHAR(255) NULL,
  price_value DECIMAL(15, 2) NULL,
  location_raw VARCHAR(255) NULL,
  normalized_location TEXT NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  image TEXT NULL,
  description LONGTEXT NULL,
  normalized_description LONGTEXT NULL,
  url TEXT NULL,
  dedupe_key CHAR(40) NULL,
  scraped_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_clean_listings_raw_id (raw_id),
  KEY idx_clean_listings_city (city),
  KEY idx_clean_listings_country (country),
  KEY idx_clean_listings_dedupe_key (dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS properties (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  raw_id VARCHAR(190) NULL,
  source VARCHAR(120) NULL,
  title VARCHAR(255) NULL,
  normalized_title VARCHAR(255) NULL,
  price_raw VARCHAR(255) NULL,
  price_value DECIMAL(15, 2) NULL,
  location_raw VARCHAR(255) NULL,
  normalized_location VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  image TEXT NULL,
  description LONGTEXT NULL,
  normalized_description LONGTEXT NULL,
  url TEXT NULL,
  dedupe_key VARCHAR(64) NULL,
  scraped_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_by_admin TINYINT(1) NOT NULL DEFAULT 0,
  manual_title VARCHAR(255) NULL,
  manual_price_raw VARCHAR(255) NULL,
  manual_price_value DECIMAL(15, 2) NULL,
  manual_location_raw VARCHAR(255) NULL,
  manual_city VARCHAR(120) NULL,
  manual_country VARCHAR(120) NULL,
  manual_image TEXT NULL,
  manual_description LONGTEXT NULL,
  manual_source VARCHAR(120) NULL,
  manual_url TEXT NULL,
  manual_scraped_at DATETIME NULL,
  admin_updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_properties_city (city),
  KEY idx_properties_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_favorite_properties (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  property_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_user_favorite_property (user_id, property_id),
  KEY idx_user_favorite_properties_user_id (user_id),
  KEY idx_user_favorite_properties_property_id (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reclamations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT NOT NULL,
  annonce_id BIGINT UNSIGNED NULL,
  site_source_id BIGINT UNSIGNED NULL,
  source_kind VARCHAR(24) NOT NULL DEFAULT 'ANNONCE',
  type VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  statut VARCHAR(24) NOT NULL DEFAULT 'NON_LU',
  priorite VARCHAR(24) NOT NULL DEFAULT 'MOYENNE',
  admin_id BIGINT NULL,
  note_admin TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_reclamations_client_id (client_id),
  KEY idx_reclamations_annonce_id (annonce_id),
  KEY idx_reclamations_status_created_at (statut, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reclamation_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reclamation_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(64) NOT NULL,
  old_status VARCHAR(24) NULL,
  new_status VARCHAR(24) NULL,
  commentaire TEXT NULL,
  admin_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reclamation_history_reclamation_id (reclamation_id),
  KEY idx_reclamation_history_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS credit_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT NOT NULL,
  property_id BIGINT UNSIGNED NULL,
  assigned_agent_user_id BIGINT NULL,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  cin VARCHAR(40) NOT NULL,
  rib VARCHAR(64) NOT NULL,
  funding_type VARCHAR(64) NULL,
  socio_category VARCHAR(64) NULL,
  property_title_snapshot VARCHAR(255) NULL,
  property_location_snapshot VARCHAR(255) NULL,
  property_price_value DECIMAL(14, 2) NULL,
  property_price_raw VARCHAR(255) NULL,
  requested_amount DECIMAL(14, 2) NULL,
  personal_contribution_value DECIMAL(14, 2) NULL,
  gross_income_value DECIMAL(14, 2) NULL,
  income_period VARCHAR(16) NULL,
  duration_months INT NULL,
  estimated_monthly_payment DECIMAL(14, 2) NULL,
  estimated_rate DECIMAL(8, 3) NULL,
  debt_ratio DECIMAL(6, 2) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'SOUMIS',
  compliance_score TINYINT UNSIGNED NULL,
  compliance_summary TEXT NULL,
  agent_note TEXT NULL,
  document_names_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_credit_applications_client_id (client_id),
  KEY idx_credit_applications_property_id (property_id),
  KEY idx_credit_applications_agent_id (assigned_agent_user_id),
  KEY idx_credit_applications_status_created_at (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS credit_application_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(64) NOT NULL,
  previous_status VARCHAR(32) NULL,
  next_status VARCHAR(32) NULL,
  comment TEXT NULL,
  agent_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_credit_application_history_application_id (application_id),
  KEY idx_credit_application_history_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scrape_sites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  spider_name VARCHAR(120) NOT NULL,
  base_url VARCHAR(255) NULL,
  start_url VARCHAR(255) NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_scrape_sites_spider_name (spider_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scraper_control (
  id TINYINT UNSIGNED NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  interval_days SMALLINT UNSIGNED NOT NULL DEFAULT 7,
  status VARCHAR(24) NOT NULL DEFAULT 'idle',
  run_type VARCHAR(32) NULL,
  current_stage VARCHAR(32) NULL,
  current_step VARCHAR(255) NULL,
  current_spider_name VARCHAR(120) NULL,
  progress_current SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  progress_total SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  progress_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  estimated_remaining_seconds INT UNSIGNED NULL,
  recent_log LONGTEXT NULL,
  last_started_at DATETIME NULL,
  last_finished_at DATETIME NULL,
  last_success_at DATETIME NULL,
  next_run_at DATETIME NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS duplicates_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  raw_id BIGINT NULL,
  source VARCHAR(120) NULL,
  title VARCHAR(255) NULL,
  location_raw VARCHAR(255) NULL,
  price_raw VARCHAR(255) NULL,
  image TEXT NULL,
  url TEXT NULL,
  reason VARCHAR(120) NULL,
  matched_clean_id BIGINT NULL,
  similarity_score DECIMAL(5, 2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
