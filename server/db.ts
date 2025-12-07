import { Pool } from "pg";

// Database connection pool
export const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "icattle_ramp",
  user: "postgres",
  password: undefined, // Use peer authentication
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database: icattle_ramp");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  process.exit(-1);
});

// Helper to execute queries
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log("Query executed", { text, duration, rows: res.rowCount });
  return res.rows;
}

// Helper to execute single row query
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

// Close pool on app shutdown
process.on("SIGINT", async () => {
  await pool.end();
  console.log("Database pool closed");
  process.exit(0);
});
