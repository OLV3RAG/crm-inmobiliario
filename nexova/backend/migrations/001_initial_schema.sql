-- NEXOVA CRM — Esquema inicial
-- Charset: utf8mb4_unicode_ci

CREATE DATABASE IF NOT EXISTS nexova_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nexova_db;

-- 1. businesses
CREATE TABLE businesses (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  industry VARCHAR(100) DEFAULT 'inmobiliaria',
  rfc VARCHAR(20),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  logo_url TEXT,
  primary_color VARCHAR(20) DEFAULT '#8B5CF6',
  plan VARCHAR(50) DEFAULT 'basic',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. users
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  last_login TIMESTAMP NULL,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. asesores
CREATE TABLE asesores (
  id CHAR(36) PRIMARY KEY,
  business_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  zone VARCHAR(100),
  specialties JSON,
  status ENUM('disponible','ocupado','inactivo') DEFAULT 'disponible',
  active BOOLEAN DEFAULT TRUE,
  max_concurrent_leads INT DEFAULT 15,
  current_leads INT DEFAULT 0,
  close_rate DECIMAL(5,2) DEFAULT 0,
  avg_response_time DECIMAL(8,2) DEFAULT 0,
  performance_score DECIMAL(4,2) DEFAULT 5.0,
  total_leads_received INT DEFAULT 0,
  total_closes INT DEFAULT 0,
  total_revenue_generated DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_business (business_id),
  INDEX idx_status (status),
  INDEX idx_performance (performance_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. users_roles
CREATE TABLE users_roles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  business_id CHAR(36),
  role ENUM('owner','admin','asesor') NOT NULL,
  asesor_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (asesor_id) REFERENCES asesores(id) ON DELETE SET NULL,
  UNIQUE KEY uk_user_business (user_id, business_id, role),
  INDEX idx_user (user_id),
  INDEX idx_business_role (business_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. properties
CREATE TABLE properties (
  id CHAR(36) PRIMARY KEY,
  business_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  property_type ENUM('casa','depa','terreno','local','oficina','bodega','preventa') NOT NULL,
  zone VARCHAR(100),
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  price DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'MXN',
  bedrooms INT,
  bathrooms DECIMAL(3,1),
  m2_construccion DECIMAL(10,2),
  m2_terreno DECIMAL(10,2),
  parking INT,
  description TEXT,
  features JSON,
  images JSON,
  status ENUM('disponible','reservada','vendida','pausada') DEFAULT 'disponible',
  asesor_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (asesor_id) REFERENCES asesores(id) ON DELETE SET NULL,
  INDEX idx_business (business_id),
  INDEX idx_zone (zone),
  INDEX idx_status (status),
  INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. leads
CREATE TABLE leads (
  id CHAR(36) PRIMARY KEY,
  business_id CHAR(36) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  source VARCHAR(50) DEFAULT 'whatsapp',
  status ENUM('new','qualifying','qualified','meeting','negotiation','closed_won','closed_lost') DEFAULT 'new',
  property_type VARCHAR(50),
  zone VARCHAR(100),
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  landing_url TEXT,
  referrer TEXT,
  bot_paused BOOLEAN DEFAULT FALSE,
  bot_paused_by CHAR(36),
  notes TEXT,
  first_contact_at TIMESTAMP NULL,
  last_contact_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  lost_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_paused_by) REFERENCES asesores(id) ON DELETE SET NULL,
  INDEX idx_business_status (business_id, status),
  INDEX idx_phone (phone),
  INDEX idx_created (created_at DESC),
  INDEX idx_utm (utm_source, utm_campaign)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. conversations
CREATE TABLE conversations (
  id CHAR(36) PRIMARY KEY,
  lead_id CHAR(36) NOT NULL,
  business_id CHAR(36) NOT NULL,
  channel VARCHAR(50) DEFAULT 'whatsapp',
  twilio_sid VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMP NULL,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_lead (lead_id),
  INDEX idx_business (business_id),
  INDEX idx_last_message (last_message_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. messages
CREATE TABLE messages (
  id CHAR(36) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  lead_id CHAR(36) NOT NULL,
  direction ENUM('inbound','outbound') NOT NULL,
  sender_type ENUM('lead','bot','asesor','system') NOT NULL,
  sender_id CHAR(36),
  content TEXT NOT NULL,
  media_url TEXT,
  twilio_sid VARCHAR(100),
  status VARCHAR(50) DEFAULT 'sent',
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  INDEX idx_conversation (conversation_id, created_at),
  INDEX idx_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. conversation_scores
CREATE TABLE conversation_scores (
  id CHAR(36) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  lead_id CHAR(36) NOT NULL,
  score INT NOT NULL,
  temperature ENUM('frio','tibio','caliente','hirviendo') NOT NULL,
  sentiment ENUM('positivo','neutro','negativo'),
  intent ENUM('explorando','comparando','decidido','objetando'),
  objections_detected JSON,
  next_best_action TEXT,
  reasoning TEXT,
  claude_model VARCHAR(50),
  updated_by ENUM('claude','manual') DEFAULT 'claude',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  INDEX idx_lead (lead_id),
  INDEX idx_score (score DESC),
  INDEX idx_temperature (temperature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. lead_assignments
CREATE TABLE lead_assignments (
  id CHAR(36) PRIMARY KEY,
  lead_id CHAR(36) NOT NULL,
  asesor_id CHAR(36) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_response_at TIMESTAMP NULL,
  response_time_minutes DECIMAL(10,2),
  status ENUM('pendiente','contactado','cita','negociacion','cierre','perdido','reasignado') DEFAULT 'pendiente',
  assignment_reason VARCHAR(255),
  closed_at TIMESTAMP NULL,
  notes TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (asesor_id) REFERENCES asesores(id) ON DELETE CASCADE,
  INDEX idx_asesor_status (asesor_id, status),
  INDEX idx_lead (lead_id),
  INDEX idx_assigned (assigned_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. coaching_insights
CREATE TABLE coaching_insights (
  id CHAR(36) PRIMARY KEY,
  asesor_id CHAR(36) NOT NULL,
  lead_id CHAR(36) NOT NULL,
  conversation_id CHAR(36),
  outcome ENUM('cierre','perdido','en_progreso') NOT NULL,
  fortalezas JSON,
  errores JSON,
  sugerencias JSON,
  frases_clave JSON,
  full_analysis TEXT,
  reviewed_by_asesor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asesor_id) REFERENCES asesores(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  INDEX idx_asesor (asesor_id),
  INDEX idx_outcome (outcome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. playbooks
CREATE TABLE playbooks (
  id CHAR(36) PRIMARY KEY,
  business_id CHAR(36) NOT NULL,
  objection_type VARCHAR(100) NOT NULL,
  scenario TEXT,
  recommended_response TEXT NOT NULL,
  success_rate DECIMAL(5,2),
  times_used INT DEFAULT 0,
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_business_objection (business_id, objection_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. marketing_campaigns
CREATE TABLE marketing_campaigns (
  id CHAR(36) PRIMARY KEY,
  business_id CHAR(36) NOT NULL,
  platform ENUM('meta','google','tiktok','organico','referido','otro') NOT NULL,
  name VARCHAR(255) NOT NULL,
  external_campaign_id VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE,
  budget DECIMAL(12,2) NOT NULL,
  spent DECIMAL(12,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  leads_generated INT DEFAULT 0,
  closes_generated INT DEFAULT 0,
  revenue_generated DECIMAL(15,2) DEFAULT 0,
  status ENUM('activa','pausada','finalizada') DEFAULT 'activa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_business_platform (business_id, platform),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. revenue
CREATE TABLE revenue (
  id CHAR(36) PRIMARY KEY,
  business_id CHAR(36) NOT NULL,
  lead_id CHAR(36),
  asesor_id CHAR(36),
  property_id CHAR(36),
  campaign_id CHAR(36),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'MXN',
  commission_amount DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(50),
  payment_date DATE NOT NULL,
  status ENUM('pendiente','confirmado','cancelado') DEFAULT 'confirmado',
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (asesor_id) REFERENCES asesores(id) ON DELETE SET NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  INDEX idx_business_date (business_id, payment_date DESC),
  INDEX idx_asesor (asesor_id),
  INDEX idx_campaign (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. expenses
CREATE TABLE expenses (
  id CHAR(36) PRIMARY KEY,
  business_id CHAR(36) NOT NULL,
  category ENUM('marketing','salarios','comisiones','herramientas','renta','servicios','otros') NOT NULL,
  subcategory VARCHAR(100),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'MXN',
  expense_date DATE NOT NULL,
  description TEXT,
  campaign_id CHAR(36),
  provider VARCHAR(255),
  receipt_url TEXT,
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_business_category (business_id, category),
  INDEX idx_date (expense_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. audit_log
CREATE TABLE audit_log (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  business_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id CHAR(36),
  ip_address VARCHAR(45),
  user_agent TEXT,
  before_data JSON,
  after_data JSON,
  status VARCHAR(50) DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  INDEX idx_user_date (user_id, created_at DESC),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. notifications
CREATE TABLE notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link_url VARCHAR(500),
  metadata JSON,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. refresh_tokens
CREATE TABLE refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token_hash),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. password_reset_tokens
CREATE TABLE password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
