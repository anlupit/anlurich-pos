import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false } });

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: 'DATABASE_URL is missing' }, { status: 500 });
  try {
    const body = await req.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) return NextResponse.json({ ok: false, error: 'No rows' }, { status: 400 });
    const values: any[] = [];
    const chunks: string[] = [];
    const seen = new Set<string>();
    rows.forEach((row: any) => {
      const part = String(row.partNumber || '').trim();
      const brand = String(row.brand || '').trim();
      const id = String(row.id || `${part}-${brand}`).slice(0, 120);
      if (!part || seen.has(id)) return;
      seen.add(id);
      const data = { ...row, id, partNumber: part, brand };
      const base = values.length;
      chunks.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},NOW())`);
      values.push(id, part, data.barcode || '', brand, data.name || data.productName || '', JSON.stringify(data));
    });
    if (!chunks.length) return NextResponse.json({ ok: false, error: 'No valid rows' }, { status: 400 });
    await pool.query(
      `INSERT INTO products (id, part_number, barcode, brand, name, data, updated_at)
       VALUES ${chunks.join(',')}
       ON CONFLICT (id) DO UPDATE SET part_number=EXCLUDED.part_number, barcode=EXCLUDED.barcode, brand=EXCLUDED.brand, name=EXCLUDED.name, data=EXCLUDED.data, updated_at=NOW()`,
      values
    );
    return NextResponse.json({ ok: true, saved: rows.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Bulk upload failed' }, { status: 500 });
  }
}
