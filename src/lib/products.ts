export type Product = {
  id: string;
  barcode?: string;
  partNumber: string;
  oemPartNumber?: string;
  brand?: string;
  name: string;
  description?: string;
  category?: string;
  position?: string;
  carMake?: string;
  carModel?: string;
  yearModel?: string;
  quantity?: number;
  location?: string;
  costPrice?: number;
  sellingPrice?: number;
  photoUrl?: string;
};

const defaultProducts: Product[] = [
  { id: '1', barcode: '123456789', partNumber: 'BRK-001', brand: 'GTX', name: 'Brake Pad Set', description: 'Front brake pads for Toyota Vios', category: 'Brake System', position: 'Front', yearModel: '2014-2020', costPrice: 1200, sellingPrice: 1850 },
  { id: '2', barcode: '223456789', partNumber: 'BRK-002', brand: 'GTX', name: 'Brake Disc', description: 'Front brake disc rotor', category: 'Brake System', position: 'Front', yearModel: '2014-2020', costPrice: 1600, sellingPrice: 2450 },
  { id: '3', barcode: '323456789', partNumber: 'OIL-5W30', brand: 'Castrol', name: 'Engine Oil 5W-30', description: 'Fully synthetic engine oil 4L', category: 'Oils & Fluids', costPrice: 650, sellingPrice: 980 },
  { id: '4', barcode: '423456789', partNumber: 'FLT-AIR-001', brand: 'GTX', name: 'Air Filter', description: 'Engine air filter element', category: 'Filters', position: 'Engine', yearModel: '2010-2018', costPrice: 250, sellingPrice: 420 },
  { id: '5', barcode: '523456789', partNumber: 'SUS-001', brand: 'KYB', name: 'Shock Absorber', description: 'Front left shock absorber', category: 'Suspension', position: 'Front Left', yearModel: '2015-2022', costPrice: 2100, sellingPrice: 3200 },
  { id: '6', barcode: '623456789', partNumber: 'BRK-003', brand: 'GTX', name: 'Brake Shoe', description: 'Rear brake shoe set', category: 'Brake System', position: 'Rear', yearModel: '2008-2015', costPrice: 620, sellingPrice: 980 },
];

export function loadProducts(): Product[] {
  if (typeof window === 'undefined') return defaultProducts;
  try {
    const raw = localStorage.getItem('anlurich-products');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveProducts(products: Product[]) {
  localStorage.setItem('anlurich-products', JSON.stringify(products));
  if (typeof window === 'undefined') return false;
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'anlurich-products', value: JSON.stringify(products) }),
  });
  if (!res.ok) {
    let message = 'Supabase save failed';
    try { const data = await res.json(); message = data.error || message; } catch {}
    throw new Error(message);
  }
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || 'Supabase save failed');
  return true;
}

export async function loadProductsCloud(): Promise<Product[]> {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) return loadProducts();
    const rows: { key: string; value: string }[] = await res.json();
    const row = rows.find((r) => r.key === 'anlurich-products');
    if (!row?.value) return loadProducts();
    const cloud = JSON.parse(row.value);
    if (Array.isArray(cloud)) {
      localStorage.setItem('anlurich-products', JSON.stringify(cloud));
      return cloud;
    }
  } catch {}
  return loadProducts();
}

export function upsertCatalogFromInvoice(lines: any[]) {
  if (typeof window === 'undefined') return { added: 0, updated: 0 };
  const products = loadProducts();
  let added = 0;
  let updated = 0;
  lines.forEach((l) => {
    const part = String(l.partNumber || '').trim();
    if (!part) return;
    const barcode = String(l.barcode || '').trim();
    const existing = products.find((p) =>
      p.partNumber.toLowerCase() === part.toLowerCase() ||
      (barcode && String(p.barcode || '').toLowerCase() === barcode.toLowerCase())
    );
    const cost = Number(l.netPrice || l.price || 0);
    const selling = cost > 0 ? Math.ceil((cost * 1.5) / 100) * 100 : undefined;
    if (existing) {
      if (l.brand) existing.brand = l.brand;
      if (l.description) existing.description = l.description;
      if (l.productName) existing.name = l.productName;
      else if (!existing.name) existing.name = part;
      if (barcode) existing.barcode = barcode;
      if (cost > 0) existing.costPrice = Math.round(cost * 100) / 100;
      if (selling) existing.sellingPrice = selling;
      updated += 1;
    } else {
      products.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        partNumber: part,
        barcode: barcode || undefined,
        brand: l.brand || undefined,
        name: l.productName || part,
        description: l.description || undefined,
        costPrice: cost > 0 ? Math.round(cost * 100) / 100 : undefined,
        sellingPrice: selling,
      });
      added += 1;
    }
  });
  saveProducts(products);
  return { added, updated };
}
