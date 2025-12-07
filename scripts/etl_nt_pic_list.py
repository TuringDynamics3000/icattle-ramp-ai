#!/usr/bin/env python3
"""
ETL script to parse NT PIC list DOCX and populate pic_registry table
"""

import re
from docx import Document
import psycopg2
from datetime import datetime

# Database connection (use Unix socket for peer auth)
conn = psycopg2.connect(
    dbname="icattle_ramp",
    user="postgres"
)
cur = conn.cursor()

# Parse DOCX
doc = Document("/home/ubuntu/upload/nt-pic-list-current.docx")

# Find the table (should be the first/main table)
table = None
for t in doc.tables:
    if len(t.rows) > 10:  # Main table should have many rows
        table = t
        break

if not table:
    print("ERROR: Could not find PIC table in DOCX")
    exit(1)

print(f"Found table with {len(table.rows)} rows")

# Parse header row to find column indexes
header_row = table.rows[0]
headers = [cell.text.strip() for cell in header_row.cells]
print(f"Headers: {headers}")

# Find column indexes
pic_idx = None
property_idx = None
region_idx = None
lga_idx = None
active_idx = None
bmp_idx = None

for i, h in enumerate(headers):
    h_upper = h.upper()
    if 'PIC' in h_upper and pic_idx is None:
        pic_idx = i
    elif 'PROPERTY' in h_upper or 'NAME' in h_upper:
        property_idx = i
    elif 'REGION' in h_upper:
        region_idx = i
    elif 'LGA' in h_upper or 'LOCAL GOVERNMENT' in h_upper:
        lga_idx = i
    elif 'ACTIVE' in h_upper:
        active_idx = i
    elif 'BMP' in h_upper:
        bmp_idx = i

print(f"Column indexes: PIC={pic_idx}, Property={property_idx}, Region={region_idx}, LGA={lga_idx}, Active={active_idx}, BMP={bmp_idx}")

# Parse data rows
inserted = 0
skipped = 0
source_version_date = '2024-12-01'  # Update this based on document date

for row_idx, row in enumerate(table.rows[1:], start=2):  # Skip header
    cells = [cell.text.strip() for cell in row.cells]
    
    # Skip empty rows
    if not any(cells):
        continue
    
    # Extract values
    pic_code = cells[pic_idx].strip().upper() if pic_idx is not None else None
    property_name = cells[property_idx].strip() if property_idx is not None else None
    region = cells[region_idx].strip() if region_idx is not None else None
    lga = cells[lga_idx].strip() if lga_idx is not None else None
    is_active = cells[active_idx].strip().upper() == 'YES' if active_idx is not None else True
    has_bmp = cells[bmp_idx].strip().upper() == 'YES' if bmp_idx is not None else False
    
    # Validate PIC code (should be 8 chars max, alphanumeric)
    if not pic_code or len(pic_code) > 8 or not re.match(r'^[A-Z0-9]+$', pic_code):
        skipped += 1
        continue
    
    # Insert into database
    try:
        cur.execute("""
            INSERT INTO pic_registry (
                pic_code, jurisdiction, property_name, region, lga,
                is_active, has_bmp, source_version_date, ingested_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (pic_code) DO UPDATE SET
                property_name = EXCLUDED.property_name,
                region = EXCLUDED.region,
                lga = EXCLUDED.lga,
                is_active = EXCLUDED.is_active,
                has_bmp = EXCLUDED.has_bmp,
                source_version_date = EXCLUDED.source_version_date,
                ingested_at = NOW()
        """, (
            pic_code,
            'NT',
            property_name,
            region,
            lga,
            is_active,
            has_bmp,
            source_version_date
        ))
        inserted += 1
        
        if inserted % 100 == 0:
            print(f"Processed {inserted} PICs...")
            
    except Exception as e:
        print(f"ERROR on row {row_idx}: {e}")
        print(f"  PIC: {pic_code}, Property: {property_name}")
        skipped += 1

# Commit and close
conn.commit()
cur.close()
conn.close()

print(f"\n✅ ETL Complete!")
print(f"   Inserted/Updated: {inserted} PICs")
print(f"   Skipped: {skipped} rows")
print(f"   Total rows processed: {inserted + skipped}")
