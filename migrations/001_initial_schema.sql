-- iCattle Ramp AI - Initial Database Schema
-- Based on DATABASE_SCHEMA.md specification

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sites table
CREATE TABLE IF NOT EXISTS icattle_sites (
    site_id VARCHAR(50) PRIMARY KEY,
    site_name VARCHAR(255) NOT NULL,
    pic VARCHAR(20) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Runs table
CREATE TABLE IF NOT EXISTS icattle_runs (
    run_id VARCHAR(50) PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL REFERENCES icattle_sites(site_id),
    run_type VARCHAR(20) NOT NULL CHECK (run_type IN ('INCOMING', 'OUTGOING')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'CONFIRMED')),
    pic VARCHAR(20) NOT NULL,
    truck_id VARCHAR(50),
    lot_number VARCHAR(50),
    counterparty_name VARCHAR(255),
    counterparty_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Run animals table (detections)
CREATE TABLE IF NOT EXISTS icattle_run_animals (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(50) NOT NULL REFERENCES icattle_runs(run_id),
    temp_ref VARCHAR(50) NOT NULL,
    animal_id VARCHAR(50),
    nlis_id VARCHAR(20),
    thumbnail_url TEXT,
    media_hash VARCHAR(255),
    lameness_score DECIMAL(3,2),
    lameness_class VARCHAR(20) CHECK (lameness_class IN ('NONE', 'MILD', 'MODERATE', 'SEVERE')),
    condition_score DECIMAL(3,2),
    tick_index DECIMAL(3,2),
    flags TEXT[], -- Array of flags
    model_confidence DECIMAL(3,2),
    excluded BOOLEAN DEFAULT FALSE,
    exclusion_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(run_id, temp_ref)
);

-- NLIS exports table
CREATE TABLE IF NOT EXISTS icattle_nlis_exports (
    export_id VARCHAR(50) PRIMARY KEY,
    run_id VARCHAR(50) NOT NULL REFERENCES icattle_runs(run_id),
    site_id VARCHAR(50) NOT NULL REFERENCES icattle_sites(site_id),
    pic VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('READY', 'GENERATING', 'FAILED')),
    file_name VARCHAR(255),
    file_url TEXT,
    upload_status VARCHAR(20) DEFAULT 'NOT_UPLOADED' CHECK (upload_status IN ('NOT_UPLOADED', 'UPLOADED', 'UNKNOWN')),
    generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animal movements table (for history)
CREATE TABLE IF NOT EXISTS icattle_animal_movements (
    id SERIAL PRIMARY KEY,
    animal_id VARCHAR(50) NOT NULL,
    nlis_id VARCHAR(20),
    run_id VARCHAR(50) REFERENCES icattle_runs(run_id),
    site_id VARCHAR(50) REFERENCES icattle_sites(site_id),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('RAMP_RUN', 'MOVEMENT', 'HEALTH')),
    occurred_at TIMESTAMP NOT NULL,
    lameness_class VARCHAR(20),
    condition_score DECIMAL(3,2),
    tick_index DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RedBelly commitments table (from TuringCore)
CREATE TABLE IF NOT EXISTS icattle_redbelly_commitments (
    commitment_id VARCHAR(100) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data_hash VARCHAR(255) NOT NULL,
    chain VARCHAR(50) NOT NULL CHECK (chain IN ('REDBELLY_TESTNET', 'REDBELLY_MAINNET')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    tx_hash VARCHAR(255),
    block_number BIGINT,
    explorer_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_runs_site_id ON icattle_runs(site_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON icattle_runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON icattle_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_animals_run_id ON icattle_run_animals(run_id);
CREATE INDEX IF NOT EXISTS idx_run_animals_animal_id ON icattle_run_animals(animal_id);
CREATE INDEX IF NOT EXISTS idx_run_animals_nlis_id ON icattle_run_animals(nlis_id);
CREATE INDEX IF NOT EXISTS idx_nlis_exports_run_id ON icattle_nlis_exports(run_id);
CREATE INDEX IF NOT EXISTS idx_animal_movements_animal_id ON icattle_animal_movements(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_movements_nlis_id ON icattle_animal_movements(nlis_id);
CREATE INDEX IF NOT EXISTS idx_redbelly_entity ON icattle_redbelly_commitments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_redbelly_status ON icattle_redbelly_commitments(status);

-- Insert default site
INSERT INTO icattle_sites (site_id, site_name, pic, address) 
VALUES ('SITE-1', 'Main Station', 'NSW123456', '123 Cattle Road, NSW 2000')
ON CONFLICT (site_id) DO NOTHING;

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO icattle_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO icattle_user;
