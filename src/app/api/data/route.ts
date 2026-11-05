import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false },
  max: 1,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json([]);
  await ensureTable();
  const { rows } = await pool.query('SELECT key, value FROM app_data');
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false });
  const body = await req.json();
  const key = String(body.key || '');
  if (!key.startsWith('anlurich-')) return NextResponse.json({ ok: false }, { status: 400 });
  await ensureTable();
  if (body.value == null) {
    await pool.query('DELETE FROM app_data WHERE key = $1', [key]);
    return NextResponse.json({ ok: true });
  }
  const text = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);
  await pool.query(
    `INSERT INTO app_data (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, text]
  );
  return NextResponse.json({ ok: true });
}
