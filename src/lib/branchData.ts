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
  return localStorage.getItem('anlurich-branch') || '';
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
  const b = invoice.branch || currentBranch() || 'unknown';
  const key = `anlurich-supplier-invoices-${b}`;
  const cloud = await pullCloud(key);
  const existing = Array.isArray(cloud) ? cloud : JSON.parse(localStorage.getItem(key) || '[]');
  const next = [...existing.filter((i: any) => i.id !== invoice.id && i.invoiceNumber !== invoice.invoiceNumber), invoice];
  await pushCloud(key, next);
  const saved = await pullCloud(key);
  const ok = Array.isArray(saved) && saved.some((i: any) => i.invoiceNumber === invoice.invoiceNumber);
  if (!ok) throw new Error('Supabase did not confirm the invoice');
  localStorage.setItem(key, JSON.stringify(saved));
  return saved;
}

export async function loadInvoicesCloud(branch?: string): Promise<any[]> {
  const b = branch || currentBranch();
  if (b === 'admin' || !b) return loadInvoices(b);
  const key = `anlurich-supplier-invoices-${b}`;
  const local = loadInvoices(b);
  const cloud = await pullCloud(key);
  if (!Array.isArray(cloud)) return local;
  const byKey = new Map<string, any>();
  [...local, ...cloud].forEach((inv) => {
    const k = String(inv.id || `${inv.supplierName}-${inv.invoiceNumber || inv.invoiceNo}`);
    const prev = byKey.get(k);
    const nextStamp = String(inv.updatedAt || inv.createdAt || '');
    const prevStamp = String(prev?.updatedAt || prev?.createdAt || '');
    const nextHasPhoto = Boolean(inv.invoiceImage);
    const prevHasPhoto = Boolean(prev?.invoiceImage);
    if (!prev || nextStamp > prevStamp || (nextStamp === prevStamp && nextHasPhoto && !prevHasPhoto)) byKey.set(k, inv);
  });
  const merged = Array.from(byKey.values());
  localStorage.setItem(key, JSON.stringify(merged));
  return merged;
}

export async function stripInvoicePhotos(branch?: string) {
  const b = branch || currentBranch() || 'unknown';
  const key = `anlurich-supplier-invoices-${b}`;
  const cloud = await pullCloud(key);
  const list = Array.isArray(cloud) ? cloud : JSON.parse(localStorage.getItem(key) || '[]');
  const cleaned = list.map((inv: any) => {
    const { invoiceImage, image, photoUrl, ...rest } = inv;
    return rest;
  });
  localStorage.setItem(key, JSON.stringify(cleaned));
  await pushCloud(key, cleaned);
  return cleaned;
}
  export async function updateInvoices(branch: string, invoices: any[]) {
  const key = `anlurich-supplier-invoices-${branch}`;
  await pushCloud(key, invoices);
  localStorage.setItem(key, JSON.stringify(invoices));
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

export async function saveStock(branch: string, stock: Record<string, Stock>) {
  const key = `anlurich-stock-${branch}`;
  await pushCloud(key, stock);
  localStorage.setItem(key, JSON.stringify(stock));
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

export function adjustStockByItem(item: { partNumber?: string; barcode?: string; qty?: number }, delta: number, branch?: string) {
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
  return { ok: true, partNumber: product.partNumber, previous: current, next };
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
  const cloud = await pullCloud(`anlurich-sales-${b}`);
  if (Array.isArray(cloud)) {
    localStorage.setItem(`anlurich-sales-${b}`, JSON.stringify(cloud));
    return cloud;
  }
  return loadSales(b);
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

export async function saveSale(sale: any) {
  const b = sale.branch || currentBranch() || 'unknown';
  const key = `anlurich-sales-${b}`;
  const cloud = await pullCloud(key);
  const existing = Array.isArray(cloud) ? cloud : JSON.parse(localStorage.getItem(key) || '[]');
  const next = [...existing, sale];
  await pushCloud(key, next);
  localStorage.setItem(key, JSON.stringify(next));
}

export async function updateSales(branch: string, sales: any[]) {
  const key = `anlurich-sales-${branch}`;
  await pushCloud(key, sales);
  localStorage.setItem(key, JSON.stringify(sales));
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

export async function saveProducts(products: any[]) {
  await pushCloud('anlurich-products', products);
  localStorage.setItem('anlurich-products', JSON.stringify(products));
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
