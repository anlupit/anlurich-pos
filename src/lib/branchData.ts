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
  });
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

function pushCloud(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: typeof value === 'string' ? value : JSON.stringify(value) }),
  }).catch(() => {});
}

async function pullCloud(key: string): Promise<any | null> {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) return null;
    const rows: { key: string; value: string }[] = await res.json();
    const row = rows.find((r) => r.key === key);
    return row?.value ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}
  export function saveInvoice(invoice: any) {
  const b = invoice.branch || currentBranch() || 'unknown';
  const key = `anlurich-supplier-invoices-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const next = [...existing, invoice];
  localStorage.setItem(key, JSON.stringify(next));
  fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: JSON.stringify(next) }),
  }).catch(() => {});
}

export function updateInvoices(branch: string, invoices: any[]) {
  localStorage.setItem(`anlurich-supplier-invoices-${branch}`, JSON.stringify(invoices));
  pushCloud(`anlurich-supplier-invoices-${branch}`, invoices);
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

export function saveStock(branch: string, stock: Record<string, Stock>) {
  const key = `anlurich-stock-${branch}`;
  localStorage.setItem(key, JSON.stringify(stock));
  pushCloud(key, stock);
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
  localStorage.setItem(key, JSON.stringify([...existing, sale]));
}

export function updateCorporate(branch: string, sales: any[]) {
  localStorage.setItem(`anlurich-corporate-${branch}`, JSON.stringify(sales));
}

export function saveSale(sale: any) {
  const b = sale.branch || currentBranch() || 'unknown';
  const key = `anlurich-sales-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const next = [...existing, sale];
  localStorage.setItem(key, JSON.stringify(next));
  pushCloud(key, next);
}

export function updateSales(branch: string, sales: any[]) {
  localStorage.setItem(`anlurich-sales-${branch}`, JSON.stringify(sales));
  pushCloud(`anlurich-sales-${branch}`, sales);
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
}

export function saveQuotation(quotation: any) {
  const b = quotation.branch || currentBranch() || 'unknown';
  const key = `anlurich-quotations-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  localStorage.setItem(key, JSON.stringify([...existing, quotation]));
  pushCloud(key, [...existing, quotation]);
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

export function saveProducts(products: any[]) {
  localStorage.setItem('anlurich-products', JSON.stringify(products));
  pushCloud('anlurich-products', products);
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
}

export function updateReturns(branch: string, returns: any[]) {
  localStorage.setItem(`anlurich-returns-${branch}`, JSON.stringify(returns));
  pushCloud(`anlurich-returns-${branch}`, returns);
}
