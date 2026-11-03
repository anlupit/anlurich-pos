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

export function saveInvoice(invoice: any) {
  const b = invoice.branch || currentBranch() || 'unknown';
  const key = `anlurich-supplier-invoices-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  localStorage.setItem(key, JSON.stringify([...existing, invoice]));
}

export function updateInvoices(branch: string, invoices: any[]) {
  localStorage.setItem(`anlurich-supplier-invoices-${branch}`, JSON.stringify(invoices));
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
  localStorage.setItem(`anlurich-stock-${branch}`, JSON.stringify(stock));
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

export function saveSale(sale: any) {
  const b = sale.branch || currentBranch() || 'unknown';
  const key = `anlurich-sales-${b}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  localStorage.setItem(key, JSON.stringify([...existing, sale]));
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
}
export function loadProducts(): any[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('anlurich-products') || '[]'); } catch { return []; }
}
