import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false },
  max: 1,
});

const DEFAULT_USERS = [
  { id: 'anlurich-1', branch: 'anlurich', name: 'User 1', password: 'Apples!' },
  { id: 'dasma-1', branch: 'dasma', name: 'User 1', password: 'Grapes!' },
  { id: 'lipa-1', branch: 'lipa', name: 'User 1', password: 'Oranges!' },
  { id: 'sezan-1', branch: 'sezan', name: 'User 1', password: 'Mangoes!' },
  { id: 'timitsu-1', branch: 'timitsu', name: 'User 1', password: 'Avocado!' },
  { id: 'avenders-1', branch: 'avenders', name: 'User 1', password: 'Thor!' },
  { id: 'admin-1', branch: 'admin', name: 'Anlupit', password: 'Guitar88!' },
];

async function ensure() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json(DEFAULT_USERS);
  await ensure();
  const { rows } = await pool.query(`SELECT value FROM app_data WHERE key = 'anlurich-users'`);
  if (!rows.length) {
    await pool.query(
      `INSERT INTO app_data (key, value) VALUES ('anlurich-users', $1) ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(DEFAULT_USERS)]
    );
    return NextResponse.json(DEFAULT_USERS);
  }
  try {
    const stored = JSON.parse(rows[0].value);
    const merged = [...stored];
    DEFAULT_USERS.forEach((d) => {
      if (!merged.some((u: any) => u.branch === d.branch && u.name === d.name)) merged.push(d);
    });
    if (merged.length !== stored.length) {
      await pool.query(
        `UPDATE app_data SET value = $1, updated_at = NOW() WHERE key = 'anlurich-users'`,
        [JSON.stringify(merged)]
      );
    }
    return NextResponse.json(merged);
  } catch { return NextResponse.json(DEFAULT_USERS); }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false });
  const users = await req.json();
  await ensure();
  await pool.query(
    `INSERT INTO app_data (key, value, updated_at) VALUES ('anlurich-users', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(users)]
  );
  return NextResponse.json({ ok: true });
}
