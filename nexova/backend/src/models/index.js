import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Business = sequelize.define('businesses', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  industry: { type: DataTypes.STRING(100), defaultValue: 'inmobiliaria' },
  rfc: DataTypes.STRING(20),
  contact_email: DataTypes.STRING(255),
  contact_phone: DataTypes.STRING(50),
  logo_url: DataTypes.TEXT,
  primary_color: { type: DataTypes.STRING(20), defaultValue: '#8B5CF6' },
  plan: { type: DataTypes.STRING(50), defaultValue: 'basic' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
}, { tableName: 'businesses' });

export const User = sequelize.define('users', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  full_name: { type: DataTypes.STRING(255), allowNull: false },
  phone: DataTypes.STRING(50),
  avatar_url: DataTypes.TEXT,
  mfa_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  mfa_secret: DataTypes.STRING(255),
  last_login: DataTypes.DATE,
  failed_login_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  locked_until: DataTypes.DATE,
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
}, { tableName: 'users' });

export const Asesor = sequelize.define('asesores', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  business_id: { type: DataTypes.CHAR(36), allowNull: false },
  user_id: DataTypes.CHAR(36),
  name: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(50), allowNull: false },
  email: DataTypes.STRING(255),
  zone: DataTypes.STRING(100),
  specialties: DataTypes.JSON,
  admin_id: DataTypes.CHAR(36),
  status: { type: DataTypes.ENUM('disponible', 'ocupado', 'inactivo'), defaultValue: 'disponible' },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  max_concurrent_leads: { type: DataTypes.INTEGER, defaultValue: 15 },
  current_leads: { type: DataTypes.INTEGER, defaultValue: 0 },
  close_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  avg_response_time: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  performance_score: { type: DataTypes.DECIMAL(4, 2), defaultValue: 5.0 },
  total_leads_received: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_closes: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_revenue_generated: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, { tableName: 'asesores' });

export const UserRole = sequelize.define('users_roles', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  user_id: { type: DataTypes.CHAR(36), allowNull: false },
  business_id: DataTypes.CHAR(36),
  role: { type: DataTypes.ENUM('owner', 'admin', 'asesor'), allowNull: false },
  asesor_id: DataTypes.CHAR(36),
}, { tableName: 'users_roles', updatedAt: false });

export const Property = sequelize.define('properties', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  business_id: { type: DataTypes.CHAR(36), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  property_type: { type: DataTypes.ENUM('casa', 'depa', 'terreno', 'local', 'oficina', 'bodega', 'preventa'), allowNull: false },
  zone: DataTypes.STRING(100),
  address: DataTypes.TEXT,
  latitude: DataTypes.DECIMAL(10, 7),
  longitude: DataTypes.DECIMAL(10, 7),
  price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'MXN' },
  bedrooms: DataTypes.INTEGER,
  bathrooms: DataTypes.DECIMAL(3, 1),
  m2_construccion: DataTypes.DECIMAL(10, 2),
  m2_terreno: DataTypes.DECIMAL(10, 2),
  parking: DataTypes.INTEGER,
  description: DataTypes.TEXT,
  features: DataTypes.JSON,
  images: DataTypes.JSON,
  status: { type: DataTypes.ENUM('disponible', 'reservada', 'vendida', 'pausada'), defaultValue: 'disponible' },
  asesor_id: DataTypes.CHAR(36),
  state: DataTypes.STRING(100),
  municipality: DataTypes.STRING(150),
  city: DataTypes.STRING(150),
  admin_id: DataTypes.CHAR(36),
}, { tableName: 'properties' });

export const Lead = sequelize.define('leads', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  business_id: { type: DataTypes.CHAR(36), allowNull: false },
  full_name: DataTypes.STRING(255),
  phone: { type: DataTypes.STRING(50), allowNull: false },
  external_id: DataTypes.STRING(120),
  email: DataTypes.STRING(255),
  source: { type: DataTypes.STRING(50), defaultValue: 'whatsapp' },
  status: { type: DataTypes.ENUM('new', 'qualifying', 'qualified', 'meeting', 'negotiation', 'closed_won', 'closed_lost'), defaultValue: 'new' },
  property_type: DataTypes.STRING(50),
  zone: DataTypes.STRING(100),
  budget_min: DataTypes.DECIMAL(15, 2),
  budget_max: DataTypes.DECIMAL(15, 2),
  utm_source: DataTypes.STRING(100),
  utm_medium: DataTypes.STRING(100),
  utm_campaign: DataTypes.STRING(100),
  utm_content: DataTypes.STRING(255),
  utm_term: DataTypes.STRING(255),
  landing_url: DataTypes.TEXT,
  referrer: DataTypes.TEXT,
  bot_paused: { type: DataTypes.BOOLEAN, defaultValue: false },
  bot_paused_by: DataTypes.CHAR(36),
  notes: DataTypes.TEXT,
  first_contact_at: DataTypes.DATE,
  last_contact_at: DataTypes.DATE,
  closed_at: DataTypes.DATE,
  lost_reason: DataTypes.STRING(255),
}, { tableName: 'leads' });

export const Conversation = sequelize.define('conversations', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  lead_id: { type: DataTypes.CHAR(36), allowNull: false },
  business_id: { type: DataTypes.CHAR(36), allowNull: false },
  channel: { type: DataTypes.STRING(50), defaultValue: 'whatsapp' },
  twilio_sid: DataTypes.STRING(512),
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_message_at: DataTypes.DATE,
  unread_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'conversations' });

export const Message = sequelize.define('messages', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  conversation_id: { type: DataTypes.CHAR(36), allowNull: false },
  lead_id: { type: DataTypes.CHAR(36), allowNull: false },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
  sender_type: { type: DataTypes.ENUM('lead', 'bot', 'asesor', 'admin', 'system'), allowNull: false },
  sender_id: DataTypes.CHAR(36),
  content: { type: DataTypes.TEXT, allowNull: false },
  media_url: DataTypes.TEXT,
  twilio_sid: DataTypes.STRING(512),
  status: { type: DataTypes.STRING(50), defaultValue: 'sent' },
  read_at: DataTypes.DATE,
}, { tableName: 'messages', updatedAt: false });

export const ConversationScore = sequelize.define('conversation_scores', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  conversation_id: { type: DataTypes.CHAR(36), allowNull: false },
  lead_id: { type: DataTypes.CHAR(36), allowNull: false },
  score: { type: DataTypes.INTEGER, allowNull: false },
  temperature: { type: DataTypes.ENUM('frio', 'tibio', 'caliente', 'hirviendo'), allowNull: false },
  sentiment: DataTypes.ENUM('positivo', 'neutro', 'negativo'),
  intent: DataTypes.ENUM('explorando', 'comparando', 'decidido', 'objetando'),
  objections_detected: DataTypes.JSON,
  next_best_action: DataTypes.TEXT,
  reasoning: DataTypes.TEXT,
  claude_model: DataTypes.STRING(50),
  updated_by: { type: DataTypes.ENUM('claude', 'manual'), defaultValue: 'claude' },
}, { tableName: 'conversation_scores', createdAt: false });

export const LeadAssignment = sequelize.define('lead_assignments', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  lead_id: { type: DataTypes.CHAR(36), allowNull: false },
  asesor_id: { type: DataTypes.CHAR(36), allowNull: false },
  assigned_at: DataTypes.DATE,
  first_response_at: DataTypes.DATE,
  response_time_minutes: DataTypes.DECIMAL(10, 2),
  status: { type: DataTypes.ENUM('pendiente', 'contactado', 'cita', 'negociacion', 'cierre', 'perdido', 'reasignado'), defaultValue: 'pendiente' },
  assignment_reason: DataTypes.STRING(255),
  closed_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
}, { tableName: 'lead_assignments', timestamps: false });

export const CoachingInsight = sequelize.define('coaching_insights', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  asesor_id: { type: DataTypes.CHAR(36), allowNull: false },
  lead_id: { type: DataTypes.CHAR(36), allowNull: false },
  conversation_id: DataTypes.CHAR(36),
  outcome: { type: DataTypes.ENUM('cierre', 'perdido', 'en_progreso'), allowNull: false },
  fortalezas: DataTypes.JSON,
  errores: DataTypes.JSON,
  sugerencias: DataTypes.JSON,
  frases_clave: DataTypes.JSON,
  full_analysis: DataTypes.TEXT,
  reviewed_by_asesor: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'coaching_insights', updatedAt: false });

export const Playbook = sequelize.define('playbooks', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  business_id: { type: DataTypes.CHAR(36), allowNull: false },
  objection_type: { type: DataTypes.STRING(100), allowNull: false },
  scenario: DataTypes.TEXT,
  recommended_response: { type: DataTypes.TEXT, allowNull: false },
  success_rate: DataTypes.DECIMAL(5, 2),
  times_used: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_by: DataTypes.CHAR(36),
}, { tableName: 'playbooks' });

export const MarketingCampaign = sequelize.define('marketing_campaigns', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  business_id: { type: DataTypes.CHAR(36), allowNull: false },
  platform: { type: DataTypes.ENUM('meta', 'google', 'tiktok', 'organico', 'referido', 'otro'), allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false },
  external_campaign_id: DataTypes.STRING(100),
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: DataTypes.DATEONLY,
  budget: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  spent: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  impressions: { type: DataTypes.BIGINT, defaultValue: 0 },
  clicks: { type: DataTypes.BIGINT, defaultValue: 0 },
  leads_generated: { type: DataTypes.INTEGER, defaultValue: 0 },
  closes_generated: { type: DataTypes.INTEGER, defaultValue: 0 },
  revenue_generated: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('activa', 'pausada', 'finalizada'), defaultValue: 'activa' },
}, { tableName: 'marketing_campaigns' });

export const Revenue = sequelize.define('revenue', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  business_id: { type: DataTypes.CHAR(36), allowNull: false },
  lead_id: DataTypes.CHAR(36),
  asesor_id: DataTypes.CHAR(36),
  property_id: DataTypes.CHAR(36),
  campaign_id: DataTypes.CHAR(36),
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'MXN' },
  commission_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  payment_method: DataTypes.STRING(50),
  payment_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('pendiente', 'confirmado', 'cancelado'), defaultValue: 'confirmado' },
  invoice_number: DataTypes.STRING(100),
  invoice_url: DataTypes.TEXT,
  notes: DataTypes.TEXT,
}, { tableName: 'revenue', updatedAt: false });

export const Expense = sequelize.define('expenses', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  business_id: { type: DataTypes.CHAR(36), allowNull: false },
  category: { type: DataTypes.ENUM('marketing', 'salarios', 'comisiones', 'herramientas', 'renta', 'servicios', 'otros'), allowNull: false },
  subcategory: DataTypes.STRING(100),
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'MXN' },
  expense_date: { type: DataTypes.DATEONLY, allowNull: false },
  description: DataTypes.TEXT,
  campaign_id: DataTypes.CHAR(36),
  provider: DataTypes.STRING(255),
  receipt_url: DataTypes.TEXT,
  created_by: DataTypes.CHAR(36),
}, { tableName: 'expenses', updatedAt: false });

export const AuditLog = sequelize.define('audit_log', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  user_id: DataTypes.CHAR(36),
  business_id: DataTypes.CHAR(36),
  action: { type: DataTypes.STRING(100), allowNull: false },
  resource_type: { type: DataTypes.STRING(100), allowNull: false },
  resource_id: DataTypes.CHAR(36),
  ip_address: DataTypes.STRING(45),
  user_agent: DataTypes.TEXT,
  before_data: DataTypes.JSON,
  after_data: DataTypes.JSON,
  status: { type: DataTypes.STRING(50), defaultValue: 'success' },
}, { tableName: 'audit_log', updatedAt: false });

export const Notification = sequelize.define('notifications', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  user_id: { type: DataTypes.CHAR(36), allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  body: DataTypes.TEXT,
  link_url: DataTypes.STRING(500),
  metadata: DataTypes.JSON,
  read_at: DataTypes.DATE,
}, { tableName: 'notifications', updatedAt: false });

export const RefreshToken = sequelize.define('refresh_tokens', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  user_id: { type: DataTypes.CHAR(36), allowNull: false },
  token_hash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
  ip_address: DataTypes.STRING(45),
  user_agent: DataTypes.TEXT,
}, { tableName: 'refresh_tokens', updatedAt: false });

export const PasswordResetToken = sequelize.define('password_reset_tokens', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  user_id: { type: DataTypes.CHAR(36), allowNull: false },
  token_hash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  used: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'password_reset_tokens', updatedAt: false });

// Associations
Business.hasMany(Asesor, { foreignKey: 'business_id' });
Asesor.belongsTo(Business, { foreignKey: 'business_id' });
User.hasMany(UserRole, { foreignKey: 'user_id' });
UserRole.belongsTo(User, { foreignKey: 'user_id' });
Business.hasMany(UserRole, { foreignKey: 'business_id' });
UserRole.belongsTo(Business, { foreignKey: 'business_id' });
Asesor.hasOne(UserRole, { foreignKey: 'asesor_id' });
UserRole.belongsTo(Asesor, { foreignKey: 'asesor_id' });
User.hasOne(Asesor, { foreignKey: 'user_id' });
Asesor.belongsTo(User, { foreignKey: 'user_id' });
Asesor.belongsTo(User, { foreignKey: 'admin_id', as: 'gerente' });
User.hasMany(Asesor, { foreignKey: 'admin_id', as: 'asesores_equipo' });

Business.hasMany(Lead, { foreignKey: 'business_id' });
Lead.belongsTo(Business, { foreignKey: 'business_id' });
Lead.hasMany(Conversation, { foreignKey: 'lead_id' });
Conversation.belongsTo(Lead, { foreignKey: 'lead_id' });
Lead.hasMany(LeadAssignment, { foreignKey: 'lead_id' });
Lead.hasMany(Message, { foreignKey: 'lead_id' });
Conversation.hasMany(Message, { foreignKey: 'conversation_id' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });
Conversation.hasOne(ConversationScore, { foreignKey: 'conversation_id' });
ConversationScore.belongsTo(Conversation, { foreignKey: 'conversation_id' });
Lead.hasMany(LeadAssignment, { foreignKey: 'lead_id' });
LeadAssignment.belongsTo(Lead, { foreignKey: 'lead_id' });
Asesor.hasMany(LeadAssignment, { foreignKey: 'asesor_id' });
LeadAssignment.belongsTo(Asesor, { foreignKey: 'asesor_id' });

Business.hasMany(Property, { foreignKey: 'business_id' });
Property.belongsTo(Business, { foreignKey: 'business_id' });
Asesor.hasMany(Property, { foreignKey: 'asesor_id', as: 'properties' });
Property.belongsTo(Asesor, { foreignKey: 'asesor_id', as: 'asesor' });
Property.belongsTo(User, { foreignKey: 'admin_id', as: 'gerente' });

export const models = {
  Business, User, Asesor, UserRole, Property, Lead, Conversation, Message,
  ConversationScore, LeadAssignment, CoachingInsight, Playbook, MarketingCampaign,
  Revenue, Expense, AuditLog, Notification, RefreshToken, PasswordResetToken,
};
