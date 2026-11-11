'use client';

import { useState, useEffect } from 'react';
import { loadProducts, Product as ManagedProduct } from '../../lib/products';

type Product = {
  id: string;
  barcode?: string;
  partNumber: string;
  oemPartNumber?: string;
  brand?: string;
  name: string;
  description?: string;
  category?: string;
  position?: string;
  yearModel?: string;
  photoUrl?: string;
  quantity?: number;
  location?: string;
  costPrice?: number;
  sellingPrice?: number;
};

export default function ProductSearchPage() {
  const [showSearch, setShowSearch] = useState(true);
  const [filters, setFilters] = useState({
    barcode: '',
    partNumber: '',
    brand: '',
    category: '',
    description: '',
  });
  const [results, setResults] = useState<Product[]>([]);
  const [searched, setSearched] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loaded = loadProducts();
    setAllProducts(loaded.map((p: ManagedProduct) => ({
      ...p,
      quantity: (p as any).quantity,
    })));
  }, []);

  const handleChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    const { barcode, partNumber, brand, category, description } = filters;

    // If all empty, show nothing or all? We'll require at least one field
    const hasFilter = Object.values(filters).some((v) => v.trim() !== '');
    if (!hasFilter) {
      setResults([]);
      setSearched(true);
      return;
    }

    let filtered = allProducts.filter((p) => {
      const matchBarcode = !barcode || (p.barcode && p.barcode.toLowerCase().includes(barcode.toLowerCase()));
      const matchPart = !partNumber || p.partNumber.toLowerCase().includes(partNumber.toLowerCase());
      const matchBrand = !brand || (p.brand && p.brand.toLowerCase().includes(brand.toLowerCase()));
      const matchCategory = !category || (p.category && p.category.toLowerCase().includes(category.toLowerCase()));
      const matchDesc =
        !description ||
        (p.description && p.description.toLowerCase().includes(description.toLowerCase())) ||
        p.name.toLowerCase().includes(description.toLowerCase());

      return matchBarcode && matchPart && matchBrand && matchCategory && matchDesc;
    });

    // Sort alphabetically by Category, then Description/Name, then Part Number
    filtered.sort((a, b) => {
      const catA = (a.category || '').toLowerCase();
      const catB = (b.category || '').toLowerCase();
      if (catA !== catB) return catA.localeCompare(catB);

      const nameA = (a.description || a.name).toLowerCase();
      const nameB = (b.description || b.name).toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);

      return a.partNumber.localeCompare(b.partNumber);
    });

    setResults(filtered);
    setSearched(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setFilters({ barcode: '', partNumber: '', brand: '', category: '', description: '' });
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 overflow-x-hidden print:bg-white print:p-0">
      {/* Header - hide on print */}
      <div className="max-w-6xl mx-auto w-full print:hidden shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">Product Search</h1>
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            {showSearch ? 'Hide Search' : 'Product Search'}
          </button>
        </div>

        {/* Search Fields */}
        {showSearch && (
          <div className="bg-white rounded-xl shadow p-4 mb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                <input
                  type="text"
                  placeholder="Scan or type barcode"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={filters.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
                <input
                  type="text"
                  placeholder="Part number"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={filters.partNumber}
                  onChange={(e) => handleChange('partNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  placeholder="e.g. GTX"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={filters.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Brake System"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={filters.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Search description or product name"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={filters.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-3">
              <button
                onClick={handleSearch}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
              >
                Search
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results - scrollable */}
      <div className="max-w-6xl mx-auto">
        {searched && (
          <div className="bg-white rounded-xl shadow print:shadow-none print:rounded-none">
            <div className="p-4 border-b flex justify-between items-center print:border-b-2">
              <div>
                <h2 className="text-lg font-semibold">
                  Search Results ({results.length})
                </h2>
                <p className="text-sm text-gray-500 print:text-black">
                  Sorted A–Z by Category → Description
                </p>
              </div>
              {results.length > 0 && (
                <button
                  onClick={handlePrint}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm print:hidden"
                >
                  Print
                </button>
              )}
            </div>
            {results.length === 0 ? (
              <p className="p-8 text-center text-gray-500">No products found matching your search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-teal-500 text-white">
                    <tr>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Barcode</th>
                      <th className="text-left p-3 font-medium">Part Number</th>
                      <th className="text-left p-3 font-medium">Brand</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">{p.category || '—'}</td>
                        <td className="p-3">{p.barcode || '—'}</td>
                        <td className="p-3 font-medium">{p.partNumber}</td>
                        <td className="p-3">{p.brand || '—'}</td>
                        <td className="p-3">{p.description || p.name || '—'}</td>
                        <td className="p-3 text-right">₱{Number(p.sellingPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

}
