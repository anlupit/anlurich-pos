'use client';

import { useState, useEffect, useRef } from 'react';
import { loadProducts, saveProducts, Product } from '../../lib/products';

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    barcode: '', partNumber: '', oemPartNumber: '', brand: '', name: '',
    description: '', category: '', position: '', carMake: '', carModel: '',
    yearModel: '', costPrice: '', sellingPrice: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProducts(loadProducts());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partNumber.trim() || !form.name.trim()) return alert('Part Number and Name are required');
    const data: Product = {
      id: editingId || Date.now().toString(),
      barcode: form.barcode || undefined,
      partNumber: form.partNumber,
      oemPartNumber: form.oemPartNumber || undefined,
      brand: form.brand || undefined,
      name: form.name,
      description: form.description || undefined,
      category: form.category || undefined,
      position: form.position || undefined,
      carMake: form.carMake || undefined,
      carModel: form.carModel || undefined,
      yearModel: form.yearModel || undefined,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
      sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined,
    };
    const updated = editingId
      ? products.map((p) => (p.id === editingId ? data : p))
      : [...products, data];
    setProducts(updated);
    saveProducts(updated);
    setForm({ barcode: '', partNumber: '', oemPartNumber: '', brand: '', name: '', description: '', category: '', position: '', carMake: '', carModel: '', yearModel: '', costPrice: '', sellingPrice: '' });
    setEditingId(null);
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      barcode: p.barcode || '',
      partNumber: p.partNumber,
      oemPartNumber: p.oemPartNumber || '',
      brand: p.brand || '',
      name: p.name,
      description: p.description || '',
      category: p.category || '',
      position: p.position || '',
      carMake: p.carMake || '',
      carModel: p.carModel || '',
      yearModel: p.yearModel || '',
      costPrice: p.costPrice != null ? String(p.costPrice) : '',
      sellingPrice: p.sellingPrice != null ? String(p.sellingPrice) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this product from the catalog?')) return;
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    saveProducts(updated);
    if (editingId === id) setEditingId(null);
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    const num = (row: any, names: string[]) => {
      const keys = Object.keys(row);
      const want = names.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const key = keys.find((k) => want.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
      if (!key || row[key] == null || row[key] === '') return undefined;
      const n = parseFloat(String(row[key]).replace(/[^0-9.]/g, ''));
      return isNaN(n) ? undefined : Math.round(n * 100) / 100;
    };
    const text = (row: any, names: string[]) => {
      const keys = Object.keys(row);
      const want = names.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const key = keys.find((k) => want.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
      return key ? String(row[key] ?? '').trim() : '';
    };
    const newProducts: Product[] = rows.map((r, i) => ({
      id: Date.now().toString() + i,
      partNumber: text(r, ['Part Number', 'partNumber', 'Part No']),
      name: text(r, ['Name', 'Product Name', 'name']),
      barcode: text(r, ['Barcode']) || undefined,
      oemPartNumber: text(r, ['OEM Part Number', 'oemPartNumber']) || undefined,
      brand: text(r, ['Brand']) || undefined,
      description: text(r, ['Description']) || undefined,
      category: text(r, ['Category']) || undefined,
      position: text(r, ['Position']) || undefined,
      carMake: text(r, ['Car Make', 'carMake']) || undefined,
      carModel: text(r, ['Car Model', 'carModel']) || undefined,
      yearModel: text(r, ['Year Model', 'yearModel']) || undefined,
      costPrice: num(r, ['Cost Price', 'Cost', 'costPrice', 'CostPrice']),
      sellingPrice: num(r, ['Selling Price', 'Selling', 'sellingPrice', 'Price']),
    })).filter((p) => p.partNumber && p.name);
    if (newProducts.length === 0) return alert('No valid rows. Need Part Number and Name columns.');
    const updated = [...products, ...newProducts];
    setProducts(updated);
    saveProducts(updated);
    alert(`Imported ${newProducts.length} products`);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csv = 'Part Number,Name,Barcode,OEM Part Number,Brand,Description,Category,Position,Car Make,Car Model,Year Model,Cost Price,Selling Price\nBRK-001,Brake Pad Set,123456789,OEM-001,GTX,Front brake pads,Brake System,Front,Toyota,Vios,2014-2020,1200,1850';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'product-catalog-template.csv';
    a.click();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Product Catalog</h1>
      <div className="text-xs text-gray-500 mb-4">Shared by all branches</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex gap-3 mb-3">
          <button onClick={downloadTemplate} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Download Template</button>
          <label className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm cursor-pointer">
            Mass Upload (Excel/CSV)
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcel} />
          </label>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Part Number *" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} required />
          <input className="border rounded px-2 py-1" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="border rounded px-2 py-1" placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="OEM Part Number" value={form.oemPartNumber} onChange={(e) => setForm({ ...form, oemPartNumber: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Car Make" value={form.carMake} onChange={(e) => setForm({ ...form, carMake: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Car Model" value={form.carModel} onChange={(e) => setForm({ ...form, carModel: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Year Model" value={form.yearModel} onChange={(e) => setForm({ ...form, yearModel: e.target.value })} />
          <input type="number" step="0.01" className="border rounded px-2 py-1" placeholder="Cost Price" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          <input type="number" step="0.01" className="border rounded px-2 py-1" placeholder="Selling Price" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          <button type="submit" className="bg-blue-700 text-white px-4 py-1 rounded-lg">{editingId ? 'Update' : 'Add Product'}</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Part Number</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Brand</th>
              <th className="text-left p-2">Description</th>
              <th className="text-right p-2">Cost</th>
              <th className="text-right p-2">Selling</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-medium">{p.partNumber}</td>
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.brand || '—'}</td>
                <td className="p-2">{p.description || '—'}</td>
                <td className="p-2 text-right">{p.costPrice != null ? `₱${p.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                <td className="p-2 text-right">{p.sellingPrice != null ? `₱${p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(p)} className="text-blue-600 text-xs font-medium mr-3">View / Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
