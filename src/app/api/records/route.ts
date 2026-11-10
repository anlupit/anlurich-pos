import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false },
  max: 5,
});

const BRANCHES = ['anlurich', 'dasma', 'sezan', 'timitsu', 'avenders', 'lipa'];
const SPLIT = ['supplier_invoices', 'sales', 'no_invoices', 'customer_points', 'inventory', 'customers', 'employees', 'expenses'];

function tableFor(base: string, branch?: string | null) {
  const b = String(branch || '').toLowerCase();
  if (SPLIT.includes(base) && BRANCHES.includes(b)) return `${base}_${b}`;
  return base;
}
let ready = false;
async function ensure() {
  if (ready) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      invoice_number TEXT,
      supplier_name TEXT,
      invoice_date TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS supplier_invoices_branch_idx ON supplier_invoices (branch);
    CREATE INDEX IF NOT EXISTS supplier_invoices_date_idx ON supplier_invoices (invoice_date);
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      invoice_number TEXT,
      customer_name TEXT,
      sale_date TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sales_branch_idx ON sales (branch);
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      part_number TEXT,
      barcode TEXT,
      brand TEXT,
      name TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      product_id TEXT,
      qty NUMERIC DEFAULT 0,
      location TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS inventory_branch_idx ON inventory (branch);
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS customers_branch_idx ON customers (branch);
    CREATE TABLE IF NOT EXISTS no_invoices (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      invoice_number TEXT,
      sale_date TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS no_invoices_branch_idx ON no_invoices (branch);
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      name TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS employees_branch_idx ON employees (branch);
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      expense_date TEXT,
      category TEXT,
      payee TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS expenses_branch_idx ON expenses (branch);
    CREATE TABLE IF NOT EXISTS customer_points (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS customer_points_branch_idx ON customer_points (branch);
  `);
  for (const b of BRANCHES) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS supplier_invoices_${b} (
        id TEXT PRIMARY KEY, branch TEXT NOT NULL, invoice_number TEXT, supplier_name TEXT, invoice_date TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS supplier_invoices_${b}_date_idx ON supplier_invoices_${b} (invoice_date);
      CREATE TABLE IF NOT EXISTS sales_${b} (
        id TEXT PRIMARY KEY, branch TEXT NOT NULL, invoice_number TEXT, customer_name TEXT, sale_date TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS no_invoices_${b} (
        id TEXT PRIMARY KEY, branch TEXT NOT NULL, invoice_number TEXT, sale_date TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS customer_points_${b} (
        id TEXT PRIMARY KEY, branch TEXT NOT NULL, customer_name TEXT, customer_phone TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS inventory_${b} (
        id TEXT PRIMARY KEY, branch TEXT NOT NULL, product_id TEXT, qty NUMERIC DEFAULT 0, location TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS customers_${b} (
        id TEXT PRIMARY KEY, branch TEXT NOT NULL, name TEXT, phone TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS employees_${b} (
        id TEXT PRIMARY KEY, branch TEXT NOT NULL, name TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS expenses_${b} (
        id TEXT PRIMARY KEY, branch TEXT NOT NULL, expense_date TEXT, category TEXT, payee TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }
  ready = true;
}

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'DATABASE_URL is missing' }, { status: 500 });
  try {
    await ensure();
    const url = new URL(req.url);
    const table = url.searchParams.get('table') || 'supplier_invoices';
    if (!['supplier_invoices', 'sales', 'products', 'inventory', 'customers', 'employees', 'no_invoices', 'expenses', 'customer_points'].includes(table)) return NextResponse.json({ error: 'Bad table' }, { status: 400 });
    const branch = url.searchParams.get('branch');
    const physical = tableFor(table, branch);
    if (SPLIT.includes(table) && !BRANCHES.includes(String(branch || '').toLowerCase())) {
      const all: any[] = [];
      for (const b of BRANCHES) {
        const { rows } = await pool.query(`SELECT data FROM ${table}_${b} ORDER BY updated_at DESC LIMIT 500`);
        all.push(...rows.map((r) => r.data));
      }
      const legacy = await pool.query(`SELECT data FROM ${table} ORDER BY updated_at DESC LIMIT 2000`).catch(() => ({ rows: [] }));
      all.push(...legacy.rows.map((r: any) => r.data));
      const seen = new Set<string>();
      return NextResponse.json(all.filter((row) => {
        const id = String(row?.id || '');
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      }));
    }
    const month = url.searchParams.get('month');
    const supplier = url.searchParams.get('supplier');
    const invoiceNo = url.searchParams.get('invoiceNo');
    const part = url.searchParams.get('part');
    const brand = url.searchParams.get('brand');
    const values: any[] = [];
    const where: string[] = [];
    if (branch && table !== 'products') { values.push(branch); where.push(`branch = $${values.length}`); }
    if (month && table === 'supplier_invoices') { values.push(`${month}%`); where.push(`invoice_date LIKE $${values.length}`); }
    if (supplier && table === 'supplier_invoices') { values.push(`%${supplier}%`); where.push(`supplier_name ILIKE $${values.length}`); }
    if (invoiceNo && table === 'supplier_invoices') { values.push(`%${invoiceNo}%`); where.push(`invoice_number ILIKE $${values.length}`); }
    if (part && table === 'supplier_invoices') { values.push(`%${part}%`); where.push(`data::text ILIKE $${values.length}`); }
    if (brand && table === 'supplier_invoices') { values.push(`%${brand}%`); where.push(`data::text ILIKE $${values.length}`); }
    const limit = table === 'products' || table === 'inventory' ? 5000 : 500;
    const sql = `SELECT data FROM ${physical} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC LIMIT ${limit}`;
    const { rows } = await pool.query(sql, values);
    const seen = new Set<string>();
    return NextResponse.json(rows.map((r) => r.data).filter((row) => {
      const id = String(row?.id || JSON.stringify(row));
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Supabase failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: 'DATABASE_URL is missing' }, { status: 500 });
  try {
    await ensure();
    const body = await req.json();
    const table = String(body.table || 'supplier_invoices');
    if (!['supplier_invoices', 'sales', 'products', 'inventory', 'customers', 'employees', 'no_invoices', 'expenses', 'customer_points'].includes(table)) return NextResponse.json({ ok: false, error: 'Bad table' }, { status: 400 });
    if (body.migrateOldInvoices) {
      const invoices = await pool.query(`SELECT data FROM supplier_invoices`);
      for (const row of invoices.rows) {
        const data = { ...(row.data || {}), branch: 'anlurich' };
        await upsert('supplier_invoices_anlurich', data);
      }
      await pool.query(`DELETE FROM supplier_invoices`);

      const sales = await pool.query(`SELECT data FROM sales`);
      for (const row of sales.rows) {
        const data = { ...(row.data || {}), branch: 'anlurich' };
        await upsert('sales_anlurich', data);
      }
      await pool.query(`DELETE FROM sales`);

      const noInv = await pool.query(`SELECT data FROM no_invoices`);
      for (const row of noInv.rows) {
        const data = { ...(row.data || {}), branch: 'anlurich' };
        await upsert('no_invoices_anlurich', data);
      }
      await pool.query(`DELETE FROM no_invoices`);

      const customers = await pool.query(`SELECT data FROM customers`);
      for (const row of customers.rows) {
        const data = { ...(row.data || {}), branch: 'anlurich' };
        await upsert('customers_anlurich', data);
      }
      await pool.query(`DELETE FROM customers`);

      return NextResponse.json({ ok: true, moved: { invoices: invoices.rows.length, sales: sales.rows.length, noInvoices: noInv.rows.length, customers: customers.rows.length } });
    }
    if (body.migrate && Array.isArray(body.rows)) {
      for (const row of body.rows) await upsert(table, row);
      return NextResponse.json({ ok: true, migrated: body.rows.length });
    }
    const row = body.row || body;
    const physical = tableFor(table, row.branch || body.branch);
    if (SPLIT.includes(table) && physical === table) return NextResponse.json({ ok: false, error: 'Branch is required. Login to a branch first.' }, { status: 400 });
    if (body.deleteId) {
      await pool.query(`DELETE FROM ${physical} WHERE id = $1`, [String(body.deleteId)]);
      return NextResponse.json({ ok: true });
    }
    await upsert(physical, row);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Supabase failed' }, { status: 500 });
  }
}

async function upsert(table: string, row: any) {
  const id = String(row.id || `${row.branch || ''}-${row.invoiceNumber || row.partNumber || Date.now()}`);
  const data = { ...row, id };
  if (table.startsWith('supplier_invoices')) {
    await pool.query(
      `INSERT INTO ${table} (id, branch, invoice_number, supplier_name, invoice_date, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, invoice_number=EXCLUDED.invoice_number, supplier_name=EXCLUDED.supplier_name, invoice_date=EXCLUDED.invoice_date, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.branch || '', data.invoiceNumber || data.invoiceNo || '', data.supplierName || '', data.invoiceDate || '', JSON.stringify(data)]
    );
  } else if (table.startsWith('sales')) {
    await pool.query(
      `INSERT INTO ${table} (id, branch, invoice_number, customer_name, sale_date, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, invoice_number=EXCLUDED.invoice_number, customer_name=EXCLUDED.customer_name, sale_date=EXCLUDED.sale_date, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.branch || '', data.invoiceNumber || data.invoiceNo || '', data.customerName || '', data.date || data.dateTime || '', JSON.stringify(data)]
    );
  } else if (table.startsWith('inventory')) {
    await pool.query(
      `INSERT INTO ${table} (id, branch, product_id, qty, location, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, product_id=EXCLUDED.product_id, qty=EXCLUDED.qty, location=EXCLUDED.location, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.branch || '', data.productId || data.product_id || '', Number(data.qty || 0), data.location || '', JSON.stringify(data)]
    );
  } else if (table.startsWith('no_invoices')) {
    await pool.query(
      `INSERT INTO ${table} (id, branch, invoice_number, sale_date, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, invoice_number=EXCLUDED.invoice_number, sale_date=EXCLUDED.sale_date, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.branch || '', data.invoiceNo || data.invoiceNumber || '', data.date || '', JSON.stringify(data)]
    );
  } else if (table.startsWith('expenses')) {
    await pool.query(
      `INSERT INTO ${table} (id, branch, expense_date, category, payee, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, expense_date=EXCLUDED.expense_date, category=EXCLUDED.category, payee=EXCLUDED.payee, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.branch || '', data.date || '', data.category || '', data.payee || '', JSON.stringify(data)]
    );
  } else if (table.startsWith('customer_points')) {
    await pool.query(
      `INSERT INTO ${table} (id, branch, customer_name, customer_phone, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, customer_name=EXCLUDED.customer_name, customer_phone=EXCLUDED.customer_phone, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.branch || '', data.customerName || '', data.customerPhone || '', JSON.stringify(data)]
    );
  } else if (table.startsWith('customers')) {
    await pool.query(
      `INSERT INTO ${table} (id, branch, name, phone, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, name=EXCLUDED.name, phone=EXCLUDED.phone, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.branch || '', data.name || data.customerName || '', data.phone || data.customerPhone || '', JSON.stringify(data)]
    );
  } else if (table.startsWith('employees')) {
    await pool.query(
      `INSERT INTO ${table} (id, branch, name, data, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (id) DO UPDATE SET branch=EXCLUDED.branch, name=EXCLUDED.name, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.branch || '', data.name || '', JSON.stringify(data)]
    );
  } else {
    await pool.query(
      `INSERT INTO products (id, part_number, barcode, brand, name, data, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (id) DO UPDATE SET part_number=EXCLUDED.part_number, barcode=EXCLUDED.barcode, brand=EXCLUDED.brand, name=EXCLUDED.name, data=EXCLUDED.data, updated_at=NOW()`,
      [id, data.partNumber || '', data.barcode || '', data.brand || '', data.name || data.productName || '', JSON.stringify(data)]
    );
  }
}
