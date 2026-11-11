'use client';

import { useState, useEffect, useRef } from 'react';
import { currentBranch, loadStock, setStockQty, getStockQty } from '../../lib/branchData';
import { compressImage } from '../../lib/compressImage';
import { loadProducts, saveProducts, Product } from '../../lib/products';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    barcode: '',
    partNumber: '',
    oemPartNumber: '',
    brand: '',
    name: '',
    description: '',
    category: '',
    position: '',
    carMake: '',
    carModel: '',
    yearModel: '',
    quantity: '',
    location: '',
    costPrice: '',
    sellingPrice: '',
    photoUrl: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dlBrand, setDlBrand] = useState('');
  const [dlName, setDlName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prods = loadProducts();
    const stock = loadStock();
    // Overlay branch stock onto products for display
    const withStock = prods.map((p) => ({
      ...p,
      quantity: stock[p.id]?.qty ?? p.quantity ?? 0,
      location: stock[p.id]?.location ?? p.location,
    }));
    setProducts(withStock);
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const photoUrl = await compressImage(file);
    setForm((prev) => ({ ...prev, photoUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partNumber.trim() || !form.name.trim()) {
      alert('Part Number and Product Name are required');
      return;
    }

    const productData: Product = {
      id: editingId || Date.now().toString(),
      barcode: form.barcode.trim() || undefined,
      partNumber: form.partNumber.trim(),
      oemPartNumber: form.oemPartNumber.trim() || undefined,
      brand: form.brand.trim() || undefined,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      position: form.position.trim() || undefined,
      carMake: form.carMake.trim() || undefined,
      carModel: form.carModel.trim() || undefined,
      yearModel: form.yearModel.trim() || undefined,
      quantity: form.quantity ? parseInt(form.quantity) : undefined,
      location: form.location.trim() || undefined,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
      sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined,
      photoUrl: form.photoUrl || undefined,
    };

    let updated: Product[];
    if (editingId) {
      updated = products.map((p) => (p.id === editingId ? productData : p));
    } else {
      updated = [...products, productData];
    }

    setProducts(updated);
    try { await saveProducts(updated); } catch { return alert('Product photo was NOT saved. Supabase is not connected.'); }
    // Save qty/location to this branch's private inventory
    if (productData.quantity != null || productData.location) {
      setStockQty(productData.id, productData.quantity ?? 0, productData.location);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({
      barcode: '', partNumber: '', oemPartNumber: '', brand: '', name: '',
      description: '', category: '', position: '', carMake: '', carModel: '',
      yearModel: '', quantity: '', location: '', costPrice: '', sellingPrice: '', photoUrl: '',
    });
    setEditingId(null);
  };

  const handleEdit = (p: Product) => {
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
      quantity: p.quantity != null ? String(p.quantity) : '',
      location: p.location || '',
      costPrice: p.costPrice != null ? String(p.costPrice) : '',
      sellingPrice: p.sellingPrice != null ? String(p.sellingPrice) : '',
      photoUrl: p.photoUrl || '',
    });
    setEditingId(p.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this product?')) return;
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    saveProducts(updated);
  };

  const downloadProducts = () => {
    const brandQ = dlBrand.trim().toLowerCase();
    const nameQ = dlName.trim().toLowerCase();
    const list = products.filter((p) => {
      const brandOk = !brandQ || String(p.brand || '').toLowerCase().includes(brandQ);
      const nameOk = !nameQ || String(p.name || '').toLowerCase().includes(nameQ) || String(p.description || '').toLowerCase().includes(nameQ);
      return brandOk && nameOk;
    });
    if (list.length === 0) return alert('No products match that brand or name.');
    const header = 'Part Number,Barcode,Name,Brand,Category,Description,Quantity,Location,Cost Price,Selling Price';
    const lines = list.map((p) =>
      [p.partNumber, p.barcode || '', p.name, p.brand || '', p.category || '', p.description || '', p.quantity ?? 0, p.location || '', p.costPrice != null ? Number(p.costPrice).toFixed(2) : '', p.sellingPrice != null ? Number(p.sellingPrice).toFixed(2) : '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const label = [dlBrand, dlName].filter(Boolean).join('-') || 'all';
    a.download = `product-list-${label.replace(/[^a-z0-9]+/gi, '-')}.csv`;
    a.click();
  };

  const downloadQtyTemplate = () => {
    const csv = 'Part Number,Barcode,Quantity,Location\n19372594,123456789,12,A-01\nBRK-001,987654321,5,B-02';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory-quantity-template.csv';
    a.click();
  };

  const uploadQty = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer());
    const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const catalog = loadProducts();
    let updated = 0;
    let missing = 0;
    rows.forEach((r) => {
      const part = String(r['Part Number'] || r.partNumber || r['Part No'] || '').trim();
      const barcode = String(r.Barcode || r.barcode || '').trim();
      const qty = parseInt(String(r.Quantity || r.Qty || r.quantity || '0').replace(/[^0-9]/g, ''), 10);
      const location = String(r.Location || r.location || '').trim();
      if (!part && !barcode) return;
      const product = catalog.find((p) =>
        (part && p.partNumber.toLowerCase() === part.toLowerCase()) ||
        (barcode && String(p.barcode || '').toLowerCase() === barcode.toLowerCase())
      );
      if (!product) { missing += 1; return; }
      setStockQty(product.id, isNaN(qty) ? 0 : qty, location || undefined);
      updated += 1;
    });
    setProducts(loadProducts().map((p) => ({ ...p, quantity: getStockQty(p.id), location: loadStock()[p.id]?.location || p.location })));
    alert(`Updated ${updated} quantities.${missing ? ` ${missing} part numbers / barcodes not found.` : ''}`);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Product Management</h1>
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
          <a href="/" className="text-blue-600 hover:underline">← Home</a>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <input className="border rounded px-3 py-2 text-sm w-40" placeholder="Brand" value={dlBrand} onChange={(e) => setDlBrand(e.target.value)} />
          <input className="border rounded px-3 py-2 text-sm w-52" placeholder="Product Name" value={dlName} onChange={(e) => setDlName(e.target.value)} />
          <button onClick={downloadProducts} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Download Product List</button>
          <button onClick={downloadQtyTemplate} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Download Qty Template</button>
          <label className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm cursor-pointer">
            Upload Quantities (Excel/CSV)
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={uploadQty} />
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-4">Leave Brand and Product Name blank to download all. Upload matches by Part Number or Barcode and updates Quantity.</p>
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Part Number *</label>
              <input className="w-full border rounded-lg px-3 py-2" maxLength={15} value={form.partNumber} onChange={(e) => handleChange('partNumber', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Barcode</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.barcode} onChange={(e) => handleChange('barcode', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">OEM Part Number</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.oemPartNumber} onChange={(e) => handleChange('oemPartNumber', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <input className="w-full border rounded-lg px-3 py-2" maxLength={18} value={form.brand} onChange={(e) => handleChange('brand', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.category} onChange={(e) => handleChange('category', e.target.value)} placeholder="e.g. Brake System" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <input className="w-full border rounded-lg px-3 py-2" maxLength={50} value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Position</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.position} onChange={(e) => handleChange('position', e.target.value)} placeholder="e.g. Front Left" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Car Make</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.carMake} onChange={(e) => handleChange('carMake', e.target.value)} placeholder="e.g. Toyota" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Car Model</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.carModel} onChange={(e) => handleChange('carModel', e.target.value)} placeholder="e.g. Vios" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year Model</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.yearModel} onChange={(e) => handleChange('yearModel', e.target.value)} placeholder="e.g. 1995 - 2005" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Qty Available</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.quantity} onChange={(e) => handleChange('quantity', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shelf Location</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="e.g. A-01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost Price</label>
              <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2" value={form.costPrice} onChange={(e) => handleChange('costPrice', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price</label>
              <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2" value={form.sellingPrice} onChange={(e) => handleChange('sellingPrice', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Product Photo</label>
              <input type="file" accept="image/*" onChange={handlePhoto} className="text-sm" />
              {form.photoUrl && <img src={form.photoUrl} alt="" className="mt-2 h-16 rounded border" />}
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex gap-3">
              <button type="submit" className="bg-green-600 text-white px-5 py-2 rounded-lg">
                {editingId ? 'Update Product' : 'Add Product'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-5 py-2 rounded-lg">Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow">
          <h2 className="text-lg font-semibold p-5 border-b">Products ({products.length})</h2>
          {products.length === 0 ? (
            <p className="p-5 text-gray-500">No products yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3"></th>
                    <th className="text-left p-3">Part No.</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Brand</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Shelf Location</th>
                    <th className="text-right p-3">Cost</th>
                    <th className="text-right p-3">Selling</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-2">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt="" className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded" />
                        )}
                      </td>
                      <td className="p-3 font-medium">{p.partNumber}</td>
                      <td className="p-3">{p.name}</td>
                      <td className="p-3">{p.brand || '—'}</td>
                      <td className="p-3">{p.category || '—'}</td>
                      <td className="p-3">{p.location || '—'}</td>
                      <td className="p-3 text-right">{p.costPrice != null ? `₱${Number(p.costPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                      <td className="p-3 text-right">{p.sellingPrice != null ? `₱${Number(p.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => handleEdit(p)} className="text-blue-600 text-xs mr-3">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
