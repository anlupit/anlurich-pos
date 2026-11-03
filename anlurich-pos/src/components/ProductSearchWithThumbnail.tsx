'use client';

import { useState } from 'react';

type Product = {
  id: string;
  partNumber: string;
  name: string;
  brand?: string;
  barcode?: string;
  photoUrl?: string;
  sellingPrice: number;
  quantity: number;
};

export default function ProductSearchWithThumbnail() {
  const [search, setSearch] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Example products (replace with real data from your API)
  const products: Product[] = [
    {
      id: '1',
      partNumber: 'BRK-001',
      name: 'Brake Pad Set - Toyota Vios',
      brand: 'Bosch',
      barcode: '123456789',
      photoUrl: 'https://placehold.co/400x300/1e40af/white?text=Brake+Pad',
      sellingPrice: 1850,
      quantity: 12,
    },
    {
      id: '2',
      partNumber: 'OIL-5W30',
      name: 'Engine Oil 5W-30 4L',
      brand: 'Castrol',
      barcode: '987654321',
      photoUrl: 'https://placehold.co/400x300/059669/white?text=Engine+Oil',
      sellingPrice: 980,
      quantity: 25,
    },
    {
      id: '3',
      partNumber: 'FLT-AIR',
      name: 'Air Filter - Honda City',
      brand: 'Mann',
      barcode: '456789123',
      photoUrl: 'https://placehold.co/400x300/7c3aed/white?text=Air+Filter',
      sellingPrice: 420,
      quantity: 8,
    },
  ];

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.partNumber.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search)) ||
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Product Search</h1>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by part number, name, brand, or barcode..."
          className="w-full border rounded-lg px-4 py-3 text-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {/* Product List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-gray-500 text-center py-8">No products found</p>
          )}

          {filtered.map((product) => (
            <div
              key={product.id}
              className="bg-white border rounded-xl p-4 flex gap-4 items-center hover:shadow-md transition"
            >
              {/* Thumbnail */}
              {product.photoUrl ? (
                <img
                  src={product.photoUrl}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg cursor-pointer border hover:opacity-80 transition"
                  onClick={() => setSelectedImage(product.photoUrl!)}
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                  No Photo
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1">
                <div className="font-semibold">{product.name}</div>
                <div className="text-sm text-gray-600">
                  {product.partNumber} {product.brand && `• ${product.brand}`}
                </div>
                <div className="text-sm text-gray-500">
                  Stock: {product.quantity}
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  ₱{product.sellingPrice.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Larger Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Product"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-white text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
