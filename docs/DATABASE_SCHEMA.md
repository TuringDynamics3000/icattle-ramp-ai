# iCattle Ramp AI - Database Schema

**Version:** 1.0  
**Date:** December 7, 2025  
**Database:** PostgreSQL 14+

---

## Overview

This document defines the database schema for iCattle Ramp AI V1.

**Design Principles:**
- Event-sourced where appropriate (all domain changes as events)
- Projections for query optimization
- Foreign keys for referential integrity
- Indexes on common query patterns
- JSON columns for flexible metadata

---

## Core Tables

### 1. sites

Configuration for feedlot/saleyard locations.

```sql
CREATE TABLE sites (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  pic VARCHAR(20) NOT NULL,  -- Property Identification Code
  site_type VARCHAR(20) NOT NULL CHECK (site_type IN ('FEEDLOT', 'SALEYARD', 'FARM')),
  address TEXT,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  nlis_settings JSONB DEFAULT '{}',
  camera_sources JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sites_pic ON sites(pic);
CREATE INDEX idx_sites_active ON sites(active);
```

---

### 2. runs

Ramp runs (incoming/outgoing).

```sql
CREATE TABLE runs (
  id VARCHAR(50) PRIMARY KEY,
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id),
  pic VARCHAR(20) NOT NULL,
  run_type VARCHAR(20) NOT NULL CHECK (run_type IN ('INCOMING', 'OUTGOING')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'CONFIRMED')),
  
  -- Metadata
  truck_id VARCHAR(100),
  lot_number VARCHAR(100),
  counterparty_name VARCHAR(255),
  counterparty_code VARCHAR(100),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_capture_at TIMESTAMP,
  started_processing_at TIMESTAMP,
  started_review_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  
  -- Summary (populated after CV processing)
  total_detected INTEGER DEFAULT 0,
  total_included INTEGER DEFAULT 0,
  high_lameness INTEGER DEFAULT 0,
  high_tick INTEGER DEFAULT 0,
  
  -- Audit
  created_by VARCHAR(255),
  confirmed_by VARCHAR(255)
);

CREATE INDEX idx_runs_site_id ON runs(site_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_run_type ON runs(run_type);
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX idx_runs_pic ON runs(pic);
```

---

### 3. run_animals

Detected animals in a run (from CV service).

```sql
CREATE TABLE run_animals (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(50) NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  temp_ref VARCHAR(100) NOT NULL,  -- local_ref from CV
  
  -- Identification
  animal_id VARCHAR(50),  -- iCattle digital ID if matched
  nlis_id VARCHAR(50),
  id_confidence DECIMAL(5,4),  -- 0-1
  
  -- Media
  media_hash VARCHAR(255) NOT NULL,
  thumbnail_url TEXT,
  
  -- Welfare scores
  lameness_score DECIMAL(5,4),  -- 0-1
  lameness_class VARCHAR(20) CHECK (lameness_class IN ('NONE', 'MILD', 'MODERATE', 'SEVERE')),
  condition_score DECIMAL(3,1),  -- 1-5 or 1-9
  tick_index DECIMAL(5,4),  -- 0-1
  
  -- Flags and confidence
  flags JSONB DEFAULT '[]',  -- e.g. ["HIGH_LAMENESS", "HIGH_TICK"]
  model_confidence DECIMAL(5,4),  -- 0-1
  
  -- Operator adjustments
  excluded BOOLEAN DEFAULT FALSE,
  exclude_reason TEXT,
  nlis_id_override BOOLEAN DEFAULT FALSE,
  merged_into VARCHAR(100),  -- temp_ref of primary if merged
  
  -- Timestamps
  detected_at TIMESTAMP DEFAULT NOW(),
  adjusted_at TIMESTAMP,
  adjusted_by VARCHAR(255),
  
  UNIQUE(run_id, temp_ref)
);

CREATE INDEX idx_run_animals_run_id ON run_animals(run_id);
CREATE INDEX idx_run_animals_animal_id ON run_animals(animal_id);
CREATE INDEX idx_run_animals_nlis_id ON run_animals(nlis_id);
CREATE INDEX idx_run_animals_excluded ON run_animals(excluded);
CREATE INDEX idx_run_animals_flags ON run_animals USING GIN(flags);
```

---

### 4. media_uploads

Video uploads (chunked).

```sql
CREATE TABLE media_uploads (
  id VARCHAR(50) PRIMARY KEY,  -- upload_id from client
  run_id VARCHAR(50) NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  
  -- Upload metadata
  chunk_total INTEGER NOT NULL,
  chunks_received INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETE', 'FAILED')),
  
  -- Storage
  storage_path TEXT,
  file_size_bytes BIGINT,
  content_type VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- CV processing
  cv_requested_at TIMESTAMP,
  cv_completed_at TIMESTAMP,
  cv_error TEXT
);

CREATE INDEX idx_media_uploads_run_id ON media_uploads(run_id);
CREATE INDEX idx_media_uploads_status ON media_uploads(status);
```

---

### 5. media_chunks

Individual video chunks (for resumable uploads).

```sql
CREATE TABLE media_chunks (
  id SERIAL PRIMARY KEY,
  upload_id VARCHAR(50) NOT NULL REFERENCES media_uploads(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(upload_id, chunk_index)
);

CREATE INDEX idx_media_chunks_upload_id ON media_chunks(upload_id);
```

---

### 6. nlis_exports

NLIS export files.

```sql
CREATE TABLE nlis_exports (
  id VARCHAR(50) PRIMARY KEY,
  run_id VARCHAR(50) NOT NULL REFERENCES runs(id),
  
  -- File metadata
  file_name VARCHAR(255),
  file_url TEXT,
  file_size_bytes BIGINT,
  
  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('GENERATING', 'READY', 'FAILED')),
  upload_status VARCHAR(20) DEFAULT 'NOT_UPLOADED' CHECK (upload_status IN ('NOT_UPLOADED', 'UPLOADED', 'UNKNOWN')),
  
  -- Timestamps
  generated_at TIMESTAMP,
  uploaded_at TIMESTAMP,
  
  -- Error handling
  error_message TEXT,
  
  UNIQUE(run_id)
);

CREATE INDEX idx_nlis_exports_run_id ON nlis_exports(run_id);
CREATE INDEX idx_nlis_exports_status ON nlis_exports(status);
CREATE INDEX idx_nlis_exports_upload_status ON nlis_exports(upload_status);
```

---

## Event Tables (Optional - for full event sourcing)

### 7. domain_events

All domain events for audit trail.

```sql
CREATE TABLE domain_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,  -- 'run', 'animal', 'export'
  aggregate_id VARCHAR(50) NOT NULL,
  
  -- Payload
  payload JSONB NOT NULL,
  
  -- Metadata
  tenant_id VARCHAR(50) DEFAULT 'icattle',
  user_id VARCHAR(255),
  correlation_id VARCHAR(50),
  
  -- Timestamps
  occurred_at TIMESTAMP DEFAULT NOW(),
  
  -- TuringCore integration
  turing_core_event_id VARCHAR(50),
  turing_core_synced_at TIMESTAMP,
  
  -- RedBelly (for critical events)
  is_critical BOOLEAN DEFAULT FALSE,
  redbelly_commitment_id VARCHAR(100),
  redbelly_notarised_at TIMESTAMP
);

CREATE INDEX idx_domain_events_event_type ON domain_events(event_type);
CREATE INDEX idx_domain_events_aggregate ON domain_events(aggregate_type, aggregate_id);
CREATE INDEX idx_domain_events_occurred_at ON domain_events(occurred_at DESC);
CREATE INDEX idx_domain_events_is_critical ON domain_events(is_critical);
CREATE INDEX idx_domain_events_redbelly_commitment_id ON domain_events(redbelly_commitment_id);
```

---

## Projection Tables (for query optimization)

### 8. animal_history_view

Materialized view for animal history queries.

```sql
CREATE MATERIALIZED VIEW animal_history_view AS
SELECT 
  ra.animal_id,
  ra.nlis_id,
  r.id as run_id,
  r.site_id,
  r.pic,
  r.run_type,
  r.confirmed_at as occurred_at,
  ra.lameness_class,
  ra.condition_score,
  ra.tick_index,
  ra.flags,
  -- RedBelly proof (join with redbelly_commitments if available)
  NULL::VARCHAR as commitment_id,
  NULL::BOOLEAN as verified,
  NULL::VARCHAR as tx_hash,
  NULL::TEXT as explorer_url
FROM run_animals ra
JOIN runs r ON ra.run_id = r.id
WHERE ra.excluded = FALSE
  AND r.status = 'CONFIRMED'
  AND ra.animal_id IS NOT NULL
ORDER BY r.confirmed_at DESC;

CREATE INDEX idx_animal_history_view_animal_id ON animal_history_view(animal_id);
CREATE INDEX idx_animal_history_view_nlis_id ON animal_history_view(nlis_id);
```

**Refresh strategy:** `REFRESH MATERIALIZED VIEW animal_history_view;` after each run confirmation.

---

## Seed Data

### Default Site

```sql
INSERT INTO sites (id, name, pic, site_type, active) VALUES
('SITE-DEFAULT', 'Default Feedlot', 'NSW123456', 'FEEDLOT', TRUE);
```

---

## Migration Strategy

### V1 Initial Schema

```sql
-- Run migrations in order:
-- 001_create_sites.sql
-- 002_create_runs.sql
-- 003_create_run_animals.sql
-- 004_create_media_uploads.sql
-- 005_create_media_chunks.sql
-- 006_create_nlis_exports.sql
-- 007_create_domain_events.sql (optional)
-- 008_create_animal_history_view.sql
-- 009_seed_default_site.sql
```

### Future Migrations

- Add indexes as query patterns emerge
- Add computed columns for common aggregations
- Add partitioning for large tables (domain_events, run_animals)

---

## Query Patterns

### Common Queries

**1. Get run with animals for review:**
```sql
SELECT 
  r.*,
  json_agg(ra.*) as animals
FROM runs r
LEFT JOIN run_animals ra ON r.id = ra.run_id
WHERE r.id = $1
GROUP BY r.id;
```

**2. List runs with filters:**
```sql
SELECT * FROM runs
WHERE site_id = $1
  AND created_at >= $2
  AND created_at <= $3
  AND status = $4
  AND run_type = $5
ORDER BY created_at DESC
LIMIT $6 OFFSET $7;
```

**3. Get animal history:**
```sql
SELECT * FROM animal_history_view
WHERE animal_id = $1
ORDER BY occurred_at DESC
LIMIT 10;
```

**4. Get NLIS export for run:**
```sql
SELECT * FROM nlis_exports
WHERE run_id = $1;
```

---

## Performance Considerations

### Indexes
- All foreign keys indexed
- Common filter columns indexed (status, run_type, created_at)
- GIN index on JSONB columns (flags)

### Partitioning (Future)
- Partition `domain_events` by month
- Partition `run_animals` by run creation date

### Caching
- Cache site configurations
- Cache animal history views
- Cache NLIS export status

---

**End of Database Schema**
