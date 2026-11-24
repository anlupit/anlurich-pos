import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false },
});

async function ensure() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      branch TEXT,
      customer_name TEXT,
      phone TEXT,
      plate_no TEXT,
      booking_date TEXT,
      status TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings (booking_date);
    CREATE INDEX IF NOT EXISTS bookings_branch_idx ON bookings (branch);
  `);
}

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'DATABASE_URL is missing' }, { status: 500 });
  await ensure();
  const url = new URL(req.url);
  const branch = url.searchParams.get('branch');
  const date = url.searchParams.get('date');
  const values: any[] = [];
  const where: string[] = [];
  if (branch) { values.push(branch); where.push(`branch = $${values.length}`); }
  if (date) { values.push(date); where.push(`booking_date = $${values.length}`); }
  const { rows } = await pool.query(`SELECT data FROM bookings ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY booking_date ASC, updated_at DESC LIMIT 200`, values);
  return NextResponse.json(rows.map((r) => r.data));
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: 'DATABASE_URL is missing' }, { status: 500 });
  await ensure();
  const row = await req.json();
  const id = String(row.id || Date.now());
  const data = { ...row, id, status: row.status || 'Pending' };
  await pool.query(
    `INSERT INTO bookings (id, branch, customer_name, phone, plate_no, booking_date, status, data, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, customer_name=EXCLUDED.customer_name, phone=EXCLUDED.phone, plate_no=EXCLUDED.plate_no, booking_date=EXCLUDED.booking_date, status=EXCLUDED.status, data=EXCLUDED.data, updated_at=NOW()`,
    [id, data.branch || '', data.customerName || '', data.phone || '', data.plateNo || '', data.date || '', data.status || 'Pending', JSON.stringify(data)]
  );
  return NextResponse.json({ ok: true, id });
}
