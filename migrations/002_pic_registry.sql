-- PIC Registry Schema
-- Stores NT PIC list and future jurisdictions

-- PIC Registry table
CREATE TABLE IF NOT EXISTS pic_registry (
    pic_code VARCHAR(8) PRIMARY KEY,
    jurisdiction VARCHAR(10) NOT NULL DEFAULT 'NT',
    property_name TEXT,
    region TEXT,
    lga TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    has_bmp BOOLEAN DEFAULT FALSE,
    source_version_date DATE,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client property mapping
CREATE TABLE IF NOT EXISTS client_property (
    property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    pic_code VARCHAR(8) NOT NULL REFERENCES pic_registry(pic_code),
    display_name TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pic_registry_jurisdiction ON pic_registry(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_pic_registry_property_name ON pic_registry(property_name);
CREATE INDEX IF NOT EXISTS idx_pic_registry_region ON pic_registry(region);
CREATE INDEX IF NOT EXISTS idx_client_property_tenant ON client_property(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_property_pic ON client_property(pic_code);

-- Insert sample NT PICs (from the DOCX list - partial sample)
INSERT INTO pic_registry (pic_code, jurisdiction, property_name, region, lga, is_active, has_bmp, source_version_date)
VALUES
    ('TADG0708', 'NT', 'Tipperary Station', 'Darwin Rural', 'Coomalie', TRUE, TRUE, '2024-12-01'),
    ('TADG0709', 'NT', 'Bradshaw Station', 'Victoria River', 'Victoria Daly', TRUE, FALSE, '2024-12-01'),
    ('TADG0710', 'NT', 'Montejinni Station', 'Victoria River', 'Victoria Daly', TRUE, TRUE, '2024-12-01'),
    ('NSW12345', 'NSW', 'Demo Farm NSW', 'Central West', 'Dubbo', TRUE, FALSE, '2024-12-01')
ON CONFLICT (pic_code) DO NOTHING;

-- Insert sample client property mappings
INSERT INTO client_property (tenant_id, pic_code, display_name, status)
VALUES
    ('00000000-0000-0000-0000-000000000001'::UUID, 'TADG0708', 'Tipperary Station - Main', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000001'::UUID, 'NSW12345', 'Demo Farm NSW', 'ACTIVE')
ON CONFLICT (property_id) DO NOTHING;

-- Update existing sites to use PIC from registry
UPDATE icattle_sites 
SET pic = 'TADG0708' 
WHERE site_id = 'SITE-1';
