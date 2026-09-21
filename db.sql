-- =============================================================================
-- SentinelOps AI — Universal Omnichannel Reverse Logistics & Dispute Arbitrator
-- Production Database DDL Script & Seed Fixtures (PostgreSQL 16+)
-- Version: 2.1.0-PROD
-- Target Engine: PostgreSQL 16+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions & Setup
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Custom Enumeration Types
-- -----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE tenant_tier_enum AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'OPS_ANALYST', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE marketplace_enum AS ENUM (
        'SHOPEE',
        'TIKTOK_SHOP',
        'TOKOPEDIA',
        'LAZADA',
        'SHOPIFY',
        'CUSTOM_API'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE courier_code_enum AS ENUM (
        'SPX_EXPRESS',
        'JNT_EXPRESS',
        'SICEPAT',
        'ANTERAJA',
        'JNE',
        'NINJA_VAN',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE escrow_status_enum AS ENUM (
        'HELD_IN_ESCROW',
        'RELEASED_TO_SELLER',
        'REFUNDED_TO_BUYER',
        'FROZEN'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE dispute_status_enum AS ENUM (
        'INGESTED',
        'EVALUATING',
        'AUTO_REFUND',
        'ESCROW_FROZEN',
        'ESCALATE_HUMAN',
        'APPEAL_SUBMITTED',
        'RESOLVED_WON',
        'RESOLVED_LOST'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE recommended_posture_enum AS ENUM ('LOW_RISK', 'SUSPICIOUS', 'HIGH_CERTAINTY_FRAUD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE decision_lane_enum AS ENUM ('GREEN_AUTO_REFUND', 'RED_ESCROW_FROZEN', 'YELLOW_ESCALATE_HUMAN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE mutation_type_enum AS ENUM (
        'ESCROW_LOCK',
        'ESCROW_RELEASE',
        'AUTO_REFUND_ISSUED',
        'MANUAL_ADJUSTMENT'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- -----------------------------------------------------------------------------
-- 2. Timestamp Trigger Function
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. Core Multi-Tenant & Multi-Store Tables
-- -----------------------------------------------------------------------------

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    subscription_tier tenant_tier_enum NOT NULL DEFAULT 'STARTER',
    daily_refund_ceiling_idr NUMERIC(14,2) NOT NULL DEFAULT 5000000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- Store Connections Table (Omnichannel Multi-Store)
CREATE TABLE IF NOT EXISTS store_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    marketplace marketplace_enum NOT NULL,
    store_name VARCHAR(150) NOT NULL,
    external_store_id VARCHAR(100) NOT NULL,
    credentials_encrypted JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_marketplace_store UNIQUE (tenant_id, marketplace, external_store_id)
);

CREATE TRIGGER trg_store_connections_updated_at
BEFORE UPDATE ON store_connections
FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_store_connections_tenant ON store_connections(tenant_id);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'OPS_ANALYST',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);

-- -----------------------------------------------------------------------------
-- 4. Orders, Catalog, & Customer Risk Profiles
-- -----------------------------------------------------------------------------

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_connection_id UUID REFERENCES store_connections(id) ON DELETE SET NULL,
    external_order_id VARCHAR(100) NOT NULL,
    marketplace marketplace_enum NOT NULL DEFAULT 'SHOPEE',
    total_amount_idr NUMERIC(14,2) NOT NULL CHECK (total_amount_idr >= 0),
    escrow_status escrow_status_enum NOT NULL DEFAULT 'HELD_IN_ESCROW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_orders_tenant_mp_external UNIQUE (tenant_id, marketplace, external_order_id)
);

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_orders_tenant_escrow ON orders(tenant_id, escrow_status);
CREATE INDEX IF NOT EXISTS idx_orders_store_connection ON orders(store_connection_id);

-- Order Items Table (Catalog SKU)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku_code VARCHAR(80) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    catalog_weight_grams NUMERIC(10,2) NOT NULL CHECK (catalog_weight_grams > 0),
    unit_price_idr NUMERIC(14,2) NOT NULL CHECK (unit_price_idr >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku_code);

-- Customer Profiles Table (Fraud Profiling)
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_user_id VARCHAR(100) NOT NULL UNIQUE,
    account_age_days INTEGER NOT NULL DEFAULT 0,
    historical_order_count INTEGER NOT NULL DEFAULT 0,
    historical_return_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. Disputes & Multi-Carrier Telemetry
-- -----------------------------------------------------------------------------

-- Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    store_connection_id UUID REFERENCES store_connections(id) ON DELETE SET NULL,
    dispute_code VARCHAR(80) NOT NULL UNIQUE,
    customer_id VARCHAR(100) NOT NULL,
    customer_reason TEXT NOT NULL,
    proof_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    status dispute_status_enum NOT NULL DEFAULT 'INGESTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_disputes_updated_at
BEFORE UPDATE ON disputes
FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_disputes_tenant_status ON disputes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_store ON disputes(store_connection_id);

-- Logistics Telemetry Table
CREATE TABLE IF NOT EXISTS logistics_telemetries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    courier_code courier_code_enum NOT NULL DEFAULT 'SPX_EXPRESS',
    tracking_number VARCHAR(100) NOT NULL,
    hub_inbound_weight_grams NUMERIC(10,2) NOT NULL CHECK (hub_inbound_weight_grams >= 0),
    driver_handover_weight_grams NUMERIC(10,2) NOT NULL CHECK (driver_handover_weight_grams >= 0),
    delta_weight_grams NUMERIC(10,2) NOT NULL,
    deviation_ratio NUMERIC(6,4) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logistics_tracking_number ON logistics_telemetries(tracking_number);
CREATE INDEX IF NOT EXISTS idx_logistics_courier ON logistics_telemetries(courier_code);

-- -----------------------------------------------------------------------------
-- 6. Forensic AI Audits & Decision Engine Logs
-- -----------------------------------------------------------------------------

-- Forensic Audits Table (OpenAI Sensor Outputs)
CREATE TABLE IF NOT EXISTS forensic_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    visual_tamper_detected BOOLEAN NOT NULL DEFAULT FALSE,
    visual_evidence_match_rating NUMERIC(3,2) NOT NULL CHECK (visual_evidence_match_rating BETWEEN 0.00 AND 1.00),
    fraud_risk_score NUMERIC(5,2) NOT NULL CHECK (fraud_risk_score BETWEEN 0.00 AND 100.00),
    confidence_score NUMERIC(3,2) NOT NULL CHECK (confidence_score BETWEEN 0.00 AND 1.00),
    recommended_posture recommended_posture_enum NOT NULL,
    anomaly_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_model_response JSONB,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forensic_audits_risk ON forensic_audits(fraud_risk_score);
CREATE INDEX IF NOT EXISTS idx_forensic_anomalies_gin ON forensic_audits USING GIN (anomaly_reasons);

-- Decision Logs Table (Deterministic Matrix Execution)
CREATE TABLE IF NOT EXISTS decision_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    decision_lane decision_lane_enum NOT NULL,
    triggered_rule VARCHAR(120) NOT NULL,
    loss_prevented_idr NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (loss_prevented_idr >= 0),
    is_human_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    override_by UUID REFERENCES users(id) ON DELETE SET NULL,
    override_reason TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decision_logs_lane ON decision_logs(decision_lane);
CREATE INDEX IF NOT EXISTS idx_decision_logs_decided_at ON decision_logs(decided_at DESC);

-- Dispute Dossiers Table (Legal Sanggahan Documents)
CREATE TABLE IF NOT EXISTS dispute_dossiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    dossier_number VARCHAR(100) NOT NULL UNIQUE,
    marketplace_policy_applied VARCHAR(120) NOT NULL,
    markdown_content TEXT NOT NULL,
    pdf_storage_url TEXT,
    submitted_at TIMESTAMPTZ,
    external_appeal_id VARCHAR(100),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7. Immutable Financial Ledger & Audit Trail
-- -----------------------------------------------------------------------------

-- Ledger Mutations Table
CREATE TABLE IF NOT EXISTS ledger_mutations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    amount_idr NUMERIC(14,2) NOT NULL CHECK (amount_idr >= 0),
    mutation_type mutation_type_enum NOT NULL,
    balance_state_before VARCHAR(50) NOT NULL,
    balance_state_after VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant_dispute ON ledger_mutations(tenant_id, dispute_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger_mutations(created_at DESC);

-- -----------------------------------------------------------------------------
-- 8. Seed Fixtures (Sample Data for Testing & Demo)
-- -----------------------------------------------------------------------------

INSERT INTO tenants (id, name, slug, subscription_tier, daily_refund_ceiling_idr)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'PT Mega Elektronik Indonesia', 'mega-elektronik', 'GROWTH', 10000000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO store_connections (id, tenant_id, marketplace, store_name, external_store_id, credentials_encrypted)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SHOPEE', 'Mega Elektronik Official Shopee', 'SHP_ID_99012', '{"token": "mock_encrypted_shopee_token"}'::jsonb),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'TIKTOK_SHOP', 'Mega Tech TikTok Mall', 'TT_ID_44120', '{"token": "mock_encrypted_tiktok_token"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ops.lead@megaelektronik.com', '$argon2id$v=19$m=65536,t=3,p=4$mockhashvalue', 'Hendra Kusuma', 'TENANT_ADMIN')
ON CONFLICT (id) DO NOTHING;

