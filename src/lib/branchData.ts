// Branch-aware storage helpers
export function formatDate(value?: string): string {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function currentBranch(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('anlurich-branch') || sessionStorage.getItem('anlurich-auth') || '';
  return stored.toLowerCase();
}

function branchId(value?: string) {
  const raw = value || currentBranch() || (typeof window !== 'undefined' ? sessionStorage.getItem('anlurich-auth') : '') || '';
  const b = raw.toLowerCase();
  if (!b || b === 'unknown' || b === 'admin') throw new Error('Branch is required. Login to a branch first.');
  if (typeof window !== 'undefined') localStorage.setItem('anlurich-branch', b);
  return b;
}

export function isAdmin(): boolean {
  return currentBranch() === 'admin';
}

export function pointsFor(total: number): number {
  return Math.floor((total || 0) / 200);
}

export function customerPoints(name: string, phone?: string): { earned: number; redeemed: number; balance: number } {
  const sales = loadSales();
  const key = (name || '').trim().toLowerCase();
  const ph = (phone || '').trim();
  const matched = sales.filter((s) => {
    const n = String(s.customerName || '').trim().toLowerCase();
    const p = String(s.customerPhone || '').trim();
    const nameOk = key && n.includes(key);
    const phoneOk = ph && p.includes(ph);
    return nameOk || phoneOk;
  }).filter((s) => !s.noPoints && !String(s.invoiceNo || '').match(/^\d{6}-\d{2}$/));
  const earned = matched.reduce((sum, s) => sum + pointsFor(s.total || 0), 0);
  const redeemed = matched.reduce((sum, s) => sum + (s.pointsRedeemed || 0), 0);
  return { earned, redeemed, balance: Math.max(0, earned - redeemed) };
}

// Supplier invoices — private per branch
export function loadInvoices(branch?: string): any[] {
  if (typeof window === 'undefined') return [];
  const b = branch || currentBranch();
  if (b === 'admin' || !b) {
    const all: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('anlurich-supplier-invoices-')) {
        try { all.push(...JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
      }
    }
    try { all.push(...JSON.parse(localStorage.getItem('anlurich-supplier-invoices') || '[]')); } catch {}
    return all;
  }
  try {
    return JSON.parse(localStorage.getItem(`anlurich-supplier-invoices-${b}`) || '[]');
  } catch { return []; }
}

async function pushCloud(key: string, value: unknown) {
  if (typeof window === 'undefined') return false;
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: typeof value === 'string' ? value : JSON.stringify(value) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || 'Supabase save failed');
  return true;
}

async function pullCloud(key: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/data?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const rows: { key: string; value: string }[] = await res.json();
    const row = rows.find((r) => r.key === key);
    return row?.value ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}
  export async function saveInvoice(invoice: any) {
  const b = branchId(invoice.branch);
  const row = { ...invoice, branch: b, id: invoice.id || `${b}-${invoice.invoiceNumber}-${Date.now()}`, updatedAt: new Date().toISOString() };
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'supplier_invoices', row }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || 'Supabase save failed');
  return row;
}

export async function searchInvoicesCloud(filters: { month?: string; supplier?: string; invoiceNo?: string; part?: string; brand?: string }, branch?: string) {
  const b = branch || currentBranch();
  const params = new URLSearchParams({ table: 'supplier_invoices', branch: b || '' });
  if (filters.month) params.set('month', filters.month);
  if (filters.supplier) params.set('supplier', filters.supplier);
  if (filters.invoiceNo) params.set('invoiceNo', filters.invoiceNo);
  if (filters.part) params.set('part', filters.part);
  if (filters.brand) params.set('brand', filters.brand);
  const res = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function loadInvoicesCloud(branch?: string): Promise<any[]> {
  return searchInvoicesCloud({}, branch);
}

export async function stripInvoicePhotos(branch?: string) {
  return loadInvoicesCloud(branch);
}

export async function deleteInvoiceRecord(invoice: any, branch?: string) {
  if (!invoice.id && !invoice.invoiceNumber) return;
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'supplier_invoices',
      deleteId: invoice.id,
      deleteInvoiceNo: invoice.invoiceNumber || invoice.invoiceNo || '',
      branch: invoice.branch || branch || currentBranch(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || 'Delete failed');
  return true;
}

export async function clearOldInvoiceRecords() {
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'anlurich-clear-old-invoices' }),
  });
  if (typeof window !== 'undefined') {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('anlurich-supplier-invoices')) localStorage.removeItem(key);
    });
  }
}
  export async function updateInvoices(branch: string, invoices: any[]) {
  for (const inv of invoices) await saveInvoice({ ...inv, branch });
}

// Inventory (qty + location) — private per branch
type Stock = { qty: number; location?: string };

export function loadStock(branch?: string): Record<string, Stock> {
  if (typeof window === 'undefined') return {};
  const b = branch || currentBranch();
  if (!b || b === 'admin') return {};
  try {
    return JSON.parse(localStorage.getItem(`anlurich-stock-${b}`) || '{}');
  } catch { return {}; }
}

export async function saveCustomer(customer: any) {
  const b = customer.branch || currentBranch() || 'unknown';
  const row = { ...customer, branch: b, id: customer.id || `${b}-${customer.phone || customer.name}-${Date.now()}` };
  await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'customers', row }) });
  return row;
}

export async function loadCustomersCloud(branch?: string) {
  const b = branch || currentBranch();
  const res = await fetch(`/api/records?table=customers&branch=${b}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function saveEmployee(employee: any) {
  const b = employee.branch || currentBranch() || 'unknown';
  const row = { ...employee, branch: b, id: employee.id || `${b}-${employee.name}-${Date.now()}` };
  await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employees', row }) });
  return row;
}

export async function loadEmployeesCloud(branch?: string) {
  const b = branch || currentBranch();
  const res = await fetch(`/api/records?table=employees&branch=${b}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}
  export async function saveProducts(products: any[]) {
  for (const p of products) {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'products', row: { ...p, id: p.id || p.partNumber || Date.now().toString() } }),
    });
  }
}

export async function loadProductsCloud(): Promise<any[]> {
  const res = await fetch('/api/records?table=products', { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function saveStock(branch: string, stock: Record<string, Stock>) {
  for (const [productId, item] of Object.entries(stock)) {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'inventory', row: { id: `${branch}-${productId}`, branch, productId, qty: item.qty, location: item.location } }),
    });
  }
}

export async function loadStockCloud(branch?: string): Promise<Record<string, Stock>> {
  const b = branch || currentBranch();
  const res = await fetch(`/api/records?table=inventory&branch=${b}`, { cache: 'no-store' });
  if (!res.ok) return {};
  const rows = await res.json();
  const stock: Record<string, Stock> = {};
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (row.productId) stock[row.productId] = { qty: Number(row.qty || 0), location: row.location };
  });
  return stock;
}

export function getStockQty(productId: string, branch?: string): number {
  const stock = loadStock(branch);
  return stock[productId]?.qty ?? 0;
}

export function setStockQty(productId: string, qty: number, location?: string, branch?: string) {
  const b = branch || currentBranch();
  if (!b || b === 'admin') return;
  const stock = loadStock(b);
  stock[productId] = { qty, location: location ?? stock[productId]?.location };
  saveStock(b, stock);
}

export function adjustStockByItem(item: { partNumber?: string; barcode?: string; qty?: number }, delta: number, branch?: string, reason?: string) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' };
  const b = branch || currentBranch();
  if (!b || b === 'admin') return { ok: false, reason: 'no-branch' };
  const part = String(item.partNumber || '').trim().toLowerCase();
  const barcode = String(item.barcode || '').trim().toLowerCase();
  if (!part && !barcode) return { ok: false, reason: 'no-key' };
  let products: any[] = [];
  try { products = JSON.parse(localStorage.getItem('anlurich-products') || '[]'); } catch { products = []; }
  const product = products.find((p) =>
    (part && String(p.partNumber || '').trim().toLowerCase() === part) ||
    (barcode && String(p.barcode || '').trim().toLowerCase() === barcode)
  );
  if (!product) return { ok: false, reason: 'not-found', partNumber: item.partNumber };
  const current = getStockQty(product.id, b);
  const next = Math.max(0, current + delta);
  setStockQty(product.id, next, product.location, b);
  recordStockHistory({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    when: new Date().toISOString(),
    branch: b,
    who: (typeof window !== 'undefined' ? sessionStorage.getItem('anlurich-user') || localStorage.getItem('anlurich-user') || '' : '') || b,
    partNumber: product.partNumber,
    barcode: product.barcode || '',
    name: product.name || product.description || '',
    brand: product.brand || '',
    oldQty: current,
    newQty: next,
    change: delta,
    reason: reason || (delta < 0 ? 'Sale' : 'Purchase'),
  }).catch(() => {});
  return { ok: true, partNumber: product.partNumber, previous: current, next };
}

export async function recordStockHistory(entry: any) {
  const key = 'anlurich-stock-history';
  let list: any[] = [];
  try {
    const res = await fetch(`/api/data?key=${key}`, { cache: 'no-store' });
    if (res.ok) {
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows.find((r: any) => r.key === key) : null;
      if (row?.value) list = JSON.parse(row.value);
    }
  } catch {}
  if (!Array.isArray(list)) list = [];
  list.unshift(entry);
  list = list.slice(0, 2000);
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: JSON.stringify(list) }),
  });
}

export async function loadStockHistory(): Promise<any[]> {
  try {
    const res = await fetch('/api/data?key=anlurich-stock-history', { cache: 'no-store' });
    if (!res.ok) return [];
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows.find((r: any) => r.key === 'anlurich-stock-history') : null;
    const list = row?.value ? JSON.parse(row.value) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export async function logActivity(entry: { action: string; invoiceNo?: string; detail?: string; branch?: string }) {
  const key = 'anlurich-activity-log';
  let list: any[] = [];
  try {
    const res = await fetch(`/api/data?key=${key}`, { cache: 'no-store' });
    if (res.ok) {
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows.find((r: any) => r.key === key) : null;
      if (row?.value) list = JSON.parse(row.value);
    }
  } catch {}
  if (!Array.isArray(list)) list = [];
  const who = (typeof window !== 'undefined' ? sessionStorage.getItem('anlurich-user') || localStorage.getItem('anlurich-user') || '' : '') || currentBranch() || 'staff';
  list.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    when: new Date().toISOString(),
    who,
    branch: entry.branch || currentBranch() || '',
    action: entry.action,
    invoiceNo: entry.invoiceNo || '',
    detail: entry.detail || '',
  });
  list = list.slice(0, 1000);
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: JSON.stringify(list) }),
  }).catch(() => {});
}

export function loadAllStock(): Record<string, Record<string, Stock>> {
  const result: Record<string, Record<string, Stock>> = {};
  if (typeof window === 'undefined') return result;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('anlurich-stock-')) {
      const branch = key.replace('anlurich-stock-', '');
      try { result[branch] = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
    }
  }
  return result;
}

// Sales / customers — private per branch
export async function syncOnline(branch?: string) {
  const b = branch || currentBranch();
  const keys = [
    'anlurich-products',
    `anlurich-sales-${b}`,
    `anlurich-supplier-invoices-${b}`,
    `anlurich-stock-${b}`,
    `anlurich-quotations-${b}`,
    `anlurich-suppliers-${b}`,
    `anlurich-returns-${b}`,
  ];
  for (const key of keys) {
    const cloud = await pullCloud(key);
    if (cloud == null) continue;
    if (key.includes('supplier-invoices') && Array.isArray(cloud)) {
      const local = JSON.parse(localStorage.getItem(key) || '[]');
      const byKey = new Map<string, any>();
      [...(Array.isArray(local) ? local : []), ...cloud].forEach((inv) => {
        const k = String(inv.id || `${inv.supplierName}-${inv.invoiceNumber || inv.invoiceNo}`);
        const prev = byKey.get(k);
        if (!prev || String(inv.createdAt || '') > String(prev.createdAt || '')) byKey.set(k, inv);
      });
      localStorage.setItem(key, JSON.stringify(Array.from(byKey.values())));
    } else {
      localStorage.setItem(key, JSON.stringify(cloud));
    }
  }
}

export async function loadSalesCloud(branch?: string): Promise<any[]> {
  const b = branch || currentBranch();
  const params = new URLSearchParams({ table: 'sales' });
  if (b && b !== 'admin') params.set('branch', b);
  const res = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function loadPointsCloud(branch?: string): Promise<any[]> {
  const b = branch || currentBranch();
  const params = new URLSearchParams({ table: 'customer_points' });
  if (b && b !== 'admin') params.set('branch', b);
  const res = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function savePoints(row: any) {
  const b = branchId(row.branch);
  const saved = { ...row, branch: b };
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'customer_points', row: saved }),
  });
  if (!res.ok) throw new Error('Points save failed');
  return saved;
}

export async function saveSale(sale: any) {
  const b = branchId(sale.branch);
  const table = sale.noInvoice ? 'no_invoices' : 'sales';
  const row = { ...sale, branch: b, id: sale.id || `${b}-${sale.invoiceNo}-${Date.now()}`, updatedAt: new Date().toISOString() };
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, row }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || 'Supabase sale save failed');
  return row;
}

export async function loadNoInvoicesCloud(branch?: string): Promise<any[]> {
  const b = branch || currentBranch();
  const params = new URLSearchParams({ table: 'no_invoices' });
  if (b && b !== 'admin') params.set('branch', b);
  const res = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function deleteSaleRecord(sale: any, branch?: string) {
  const table = sale?.noInvoice ? 'no_invoices' : 'sales';
  const other = table === 'sales' ? 'no_invoices' : 'sales';
  const payload = {
    deleteId: sale.id,
    deleteInvoiceNo: sale.invoiceNo || sale.invoiceNumber || '',
    branch: sale.branch || branch || currentBranch(),
  };
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, ...payload }),
  });
  // Also clear the other sales table so a POS / No Invoice mix cannot leave a copy
  await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: other, ...payload }),
  }).catch(() => {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || 'Delete failed');
  return true;
}

export async function clearOldSalesRecords() {
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'anlurich-clear-old-sales' }),
  });
  if (typeof window !== 'undefined') {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('anlurich-sales')) localStorage.removeItem(key);
    });
  }
}

export function loadSales(branch?: string): any[] {
  if (typeof window === 'undefined') return [];
  const b = branch || currentBranch();
  if (b === 'admin' || !b) {
    const all: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('anlurich-sales-')) {
        try { all.push(...JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
      }
    }
    try { all.push(...JSON.parse(localStorage.getItem('anlurich-sales') || '[]')); } catch {}
    return all;
  }
  try {
    return JSON.parse(localStorage.getItem(`anlurich-sales-${b}`) || '[]');
  } catch { return []; }
}

export function loadCorporate(branch?: string): any[] {
  if (typeof window === 'undefined') return [];
  const b = branch || currentBranch();
  try { return JSON.parse(localStorage.getItem(`anlurich-corporate-${b}`) || '[]'); } catch { return []; }
}

export function saveCorporate(sale: any) {
  const b = sale.branch || currentBranch() || 'unknown';
  const key = `anlurich-corporate-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const next = [...existing, sale];
  localStorage.setItem(key, JSON.stringify(next));
  pushCloud(key, next);
}

export function updateCorporate(branch: string, sales: any[]) {
  localStorage.setItem(`anlurich-corporate-${branch}`, JSON.stringify(sales));
  pushCloud(`anlurich-corporate-${branch}`, sales);
}

// Quotations — private per branch
export function loadQuotations(branch?: string): any[] {
  if (typeof window === 'undefined') return [];
  const b = branch || currentBranch();
  if (b === 'admin' || !b) {
    const all: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('anlurich-quotations-')) {
        try { all.push(...JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
      }
    }
    return all;
  }
  try {
    return JSON.parse(localStorage.getItem(`anlurich-quotations-${b}`) || '[]');
  } catch { return []; }
}

export function deleteQuotationAt(index: number) {
  const b = currentBranch() || 'unknown';
  const key = `anlurich-quotations-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  if (index < 0 || index >= existing.length) return;
  existing.splice(index, 1);
  localStorage.setItem(key, JSON.stringify(existing));
  pushCloud(key, existing);
}

export function deleteQuotation(id: string, quotationNo?: string) {
  const b = currentBranch() || 'unknown';
  const key = `anlurich-quotations-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const updated = existing.filter((q: any) => !(q.id === id || (!q.id && quotationNo && q.quotationNo === quotationNo)));
  localStorage.setItem(key, JSON.stringify(updated));
  pushCloud(key, updated);
}

export async function saveQuotation(quotation: any) {
  const b = quotation.branch || currentBranch() || 'unknown';
  const key = `anlurich-quotations-${b}`;
  const cloud = await pullCloud(key);
  const existing = Array.isArray(cloud) ? cloud : JSON.parse(localStorage.getItem(key) || '[]');
  const next = [...existing, quotation];
  await pushCloud(key, next);
  localStorage.setItem(key, JSON.stringify(next));
}

export async function updateQuotation(quotation: any) {
  const b = quotation.branch || currentBranch() || 'unknown';
  const key = `anlurich-quotations-${b}`;
  const cloud = await pullCloud(key);
  const existing = Array.isArray(cloud) ? cloud : JSON.parse(localStorage.getItem(key) || '[]');
  const updated = existing.map((q: any) => q.id === quotation.id || q.quotationNo === quotation.quotationNo ? { ...q, ...quotation } : q);
  await pushCloud(key, updated);
  localStorage.setItem(key, JSON.stringify(updated));
}

// Suppliers — private per branch
export function loadBranchSuppliers(branch?: string): any[] {
  if (typeof window === 'undefined') return [];
  const b = branch || currentBranch();
  if (b === 'admin' || !b) {
    const all: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('anlurich-suppliers-')) {
        try { all.push(...JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
      }
    }
    return all;
  }
  try {
    return JSON.parse(localStorage.getItem(`anlurich-suppliers-${b}`) || '[]');
  } catch { return []; }
}

export function saveBranchSuppliers(suppliers: any[], branch?: string) {
  const b = branch || currentBranch() || 'unknown';
  localStorage.setItem(`anlurich-suppliers-${b}`, JSON.stringify(suppliers));
  pushCloud(`anlurich-suppliers-${b}`, suppliers);
}

export function loadProducts(): any[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('anlurich-products') || '[]'); } catch { return []; }
}

export function loadReturns(branch?: string): any[] {
  if (typeof window === 'undefined') return [];
  const b = branch || currentBranch();
  if (b === 'admin' || !b) {
    const all: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('anlurich-returns-')) {
        try { all.push(...JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
      }
    }
    return all;
  }
  try { return JSON.parse(localStorage.getItem(`anlurich-returns-${b}`) || '[]'); } catch { return []; }
}

export function saveReturn(ret: any) {
  const b = ret.branch || currentBranch() || 'unknown';
  const key = `anlurich-returns-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  localStorage.setItem(key, JSON.stringify([...existing, ret]));
  pushCloud(key, [...existing, ret]);
}

export function updateReturns(branch: string, returns: any[]) {
  localStorage.setItem(`anlurich-returns-${branch}`, JSON.stringify(returns));
  pushCloud(`anlurich-returns-${branch}`, returns);
}
