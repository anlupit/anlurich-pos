import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false },
  max: 5,
});

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tableReady = true;
}

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is missing in Vercel' }, { status: 500 });
  }
  try {
    await ensureTable();
    const key = new URL(req.url).searchParams.get('key');
    if (key) {
      const { rows } = await pool.query('SELECT key, value FROM app_data WHERE key = $1', [key]);
      return NextResponse.json(rows);
    }
    const { rows } = await pool.query('SELECT key, value FROM app_data');
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Supabase connection failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL is missing in Vercel Environment Variables' }, { status: 500 });
  }
  try {
    const body = await req.json();
    const key = String(body.key || '');
    if (key === 'anlurich-clear-old-sales') {
      const { rows } = await pool.query(`SELECT key FROM app_data WHERE key LIKE 'anlurich-sales%'`);
      for (const row of rows) {
        await pool.query('DELETE FROM app_data WHERE key = $1', [row.key]);
      }
      return NextResponse.json({ ok: true, cleared: rows.length });
    }
    if (key === 'anlurich-clear-old-invoices') {
      const { rows } = await pool.query(`SELECT key FROM app_data WHERE key LIKE 'anlurich-supplier-invoices%'`);
      for (const row of rows) {
        await pool.query('DELETE FROM app_data WHERE key = $1', [row.key]);
      }
      return NextResponse.json({ ok: true, cleared: rows.length });
    }
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
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Supabase connection failed' }, { status: 500 });
  }
}
