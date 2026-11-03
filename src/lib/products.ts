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
    if (!raw) {
      localStorage.setItem('anlurich-products', JSON.stringify(defaultProducts));
      return defaultProducts;
    }
    return JSON.parse(raw);
  } catch {
    return defaultProducts;
  }
}

export function saveProducts(products: Product[]) {
  localStorage.setItem('anlurich-products', JSON.stringify(products));
}
