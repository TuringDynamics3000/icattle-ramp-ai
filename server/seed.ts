import { pool } from "./db";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Insert sample runs
    await pool.query(`
      INSERT INTO icattle_runs (run_id, site_id, run_type, status, pic, truck_id, lot_number, counterparty_name, notes, created_at)
      VALUES 
        ('RUN-001', 'SITE-1', 'INCOMING', 'CONFIRMED', 'NSW123456', 'TRK-7', 'LOT-55', 'Smith Cattle Co', 'Good condition, no issues', NOW() - INTERVAL '2 days'),
        ('RUN-002', 'SITE-1', 'OUTGOING', 'REVIEW', 'NSW123456', 'TRK-12', 'LOT-88', 'Jones Feedlot', NULL, NOW() - INTERVAL '1 day'),
        ('RUN-003', 'SITE-1', 'INCOMING', 'PROCESSING', 'NSW123456', 'TRK-3', NULL, NULL, NULL, NOW() - INTERVAL '3 hours')
      ON CONFLICT (run_id) DO NOTHING
    `);

    console.log("✅ Sample runs inserted");

    // Insert sample animals for RUN-002 (REVIEW status)
    const lamenessClasses = ["NONE", "MILD", "MODERATE", "SEVERE"];
    
    for (let i = 1; i <= 12; i++) {
      const tempRef = `A-${String(i).padStart(4, "0")}`;
      const lamenessClass =
        lamenessClasses[Math.floor(Math.random() * lamenessClasses.length)];
      const hasNlis = Math.random() > 0.5;
      const nlisId = hasNlis
        ? `XYZ${Math.floor(Math.random() * 1000000000)}`
        : null;

      await pool.query(
        `
        INSERT INTO icattle_run_animals (
          run_id, temp_ref, animal_id, nlis_id, thumbnail_url, media_hash,
          lameness_score, lameness_class, condition_score, tick_index,
          flags, model_confidence, excluded
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (run_id, temp_ref) DO NOTHING
      `,
        [
          "RUN-002",
          tempRef,
          Math.random() > 0.3 ? `ANI-${Math.floor(Math.random() * 100000)}` : null,
          nlisId,
          `https://placehold.co/400x300/1e293b/94a3b8?text=Animal+${i}`,
          `sha256:stub-RUN-002-${i}`,
          Math.random(),
          lamenessClass,
          Math.random() * 4 + 1,
          Math.random(),
          lamenessClass === "MODERATE" || lamenessClass === "SEVERE"
            ? ["HIGH_LAMENESS"]
            : Math.random() > 0.8
            ? ["HIGH_TICK"]
            : [],
          Math.random() * 0.2 + 0.8,
          false,
        ]
      );
    }

    console.log("✅ Sample animals inserted for RUN-002");

    // Insert sample RedBelly commitments
    await pool.query(`
      INSERT INTO icattle_redbelly_commitments (
        commitment_id, entity_type, entity_id, data_type, data_hash,
        chain, status, tx_hash, explorer_url, created_at, confirmed_at
      ) VALUES 
        ('RBL_1765086945_5bccf369', 'run', 'RUN-001', 'movement', 'sha256:abc123', 'REDBELLY_TESTNET', 'CONFIRMED', '0x5bccf369abc123', 'https://testnet-explorer.redbelly.network/tx/0x5bccf369abc123', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
        ('RBL_1765173345_pending', 'run', 'RUN-002', 'health', 'sha256:def456', 'REDBELLY_TESTNET', 'PENDING', NULL, NULL, NOW() - INTERVAL '1 day', NULL)
      ON CONFLICT (commitment_id) DO NOTHING
    `);

    console.log("✅ Sample RedBelly commitments inserted");

    // Insert NLIS export for RUN-001
    await pool.query(`
      INSERT INTO icattle_nlis_exports (
        export_id, run_id, site_id, pic, status, file_name, file_url, generated_at
      ) VALUES (
        'EXP-RUN-001', 'RUN-001', 'SITE-1', 'NSW123456', 'READY', 'nlis-RUN-001.csv', '/api/exports/RUN-001.csv', NOW() - INTERVAL '2 days'
      )
      ON CONFLICT (export_id) DO NOTHING
    `);

    console.log("✅ NLIS export inserted for RUN-001");

    console.log("🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
