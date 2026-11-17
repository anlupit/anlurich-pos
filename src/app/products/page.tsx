'use client';

import { useEffect, useState } from 'react';
import { currentBranch, loadStockCloud, setStockQty } from '../../lib/branchData';
import { loadProductsCloud } from '../../lib/products';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProductsPage() {
  const [branch, setBranch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [stock, setStock] = useState<Record<string, { qty: number; location?: string }>>({});
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState('');
  const [location, setLocation] = useState('');
  const [scan, setScan] = useState('');
  const [received, setReceived] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const b = currentBranch() || '';
    setBranch(b);
    Promise.all([loadProductsCloud().catch(() => []), loadStockCloud(b).catch(() => ({}))]).then(([catalog, qtyMap]) => {
      setProducts(Array.isArray(catalog) ? catalog : []);
      setStock(qtyMap || {});
    });
  }, []);

  const pick = (p: any) => {
    setSelected(p);
    setQty(String(stock[p.id]?.qty ?? 0));
    setLocation(stock[p.id]?.location || '');
  };

  const save = async () => {
    if (!selected || !branch) return;
    setSaving(true);
    const nextQty = Number(qty) || 0;
    const shelf = location || stock[selected.id]?.location || '';
    setStockQty(selected.id, nextQty, shelf, branch);
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'inventory', row: { id: `${branch}-${selected.id}`, branch, productId: selected.id, partNumber: selected.partNumber, qty: nextQty, location: shelf } }),
    });
    setStock((prev) => ({ ...prev, [selected.id]: { qty: nextQty, location: shelf } }));
    setSaving(false);
    alert('Quantity saved for this branch.');
  };

  const receive = async () => {
    if (!selected || !branch) return;
    const add = Number(received) || 0;
    if (add <= 0) return alert('Enter the delivered quantity.');
    setSaving(true);
    const current = Number(stock[selected.id]?.qty || 0);
    const nextQty = current + add;
    const shelf = location || stock[selected.id]?.location || '';
    setStockQty(selected.id, nextQty, shelf, branch);
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'inventory', row: { id: `${branch}-${selected.id}`, branch, productId: selected.id, partNumber: selected.partNumber, qty: nextQty, location: shelf } }),
    });
    setStock((prev) => ({ ...prev, [selected.id]: { qty: nextQty, location: shelf } }));
    setQty(String(nextQty));
    setReceived('');
    setScan('');
    setSaving(false);
    alert(`Added ${add}. New quantity is ${nextQty}.`);
  };

  const onScan = (code: string) => {
    const key = code.trim().toLowerCase();
    if (!key) return;
    const found = products.find((p) => String(p.barcode || '').trim().toLowerCase() === key || String(p.partNumber || '').trim().toLowerCase() === key);
    if (!found) return alert('Barcode or part number not found in the catalog.');
    pick(found);
    setScan('');
  };

  const shown = products.filter((p) => {
    const text = `${p.partNumber || ''} ${p.barcode || ''} ${p.brand || ''} ${p.name || ''} ${p.description || ''}`.toLowerCase();
    const brandOk = !brand.trim() || String(p.brand || '').toLowerCase().includes(brand.trim().toLowerCase());
    const qtyNow = Number(stock[p.id]?.qty || 0);
    return text.includes(query.trim().toLowerCase()) && brandOk && (!lowOnly || qtyNow <= 5);
  }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')) || String(a.brand || '').localeCompare(String(b.brand || '')) || String(a.partNumber || '').localeCompare(String(b.partNumber || '')));

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-black text-[#1e3a8a] mb-1">Product Inventory</h1>
      <div className="text-sm text-gray-500 mb-3">Quantity and shelf are for this branch only. Product details come from the catalog.</div>
      <div className="grid gap-3" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="border rounded-xl p-3 bg-white">
          <div className="font-bold text-lg mb-2">1. Receive Stock</div>
          <input autoFocus className="border rounded px-2 py-2 w-full mb-2" placeholder="Scan barcode or part number" value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onScan(scan); } }} />
          <input className="border rounded px-2 py-2 w-full mb-2" placeholder="Part no., barcode, or name" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="border rounded px-2 py-2 w-full mb-2" placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <label className="text-sm flex items-center gap-2 mb-3"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only</label>
          {selected ? (
            <div className="border-t pt-3 text-sm">
              <div className="font-bold">{selected.name}</div>
              <div>Part No. {selected.partNumber}</div>
              <div>Brand {selected.brand || '—'}</div>
              <div>Barcode {selected.barcode || '—'}</div>
              <div className="mb-2">Selling {money(selected.sellingPrice || 0)}</div>
              <label className="block mb-2">Delivered quantity
                <input className="border rounded px-2 py-2 w-full mt-1" value={received} onChange={(e) => setReceived(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); receive(); } }} />
              </label>
              <button onClick={receive} disabled={saving} className="bg-green-700 text-white px-4 py-2 rounded w-full mb-2 disabled:opacity-50">{saving ? 'Saving...' : 'Add Delivered Quantity'}</button>
              <label className="block mb-2">Set quantity instead
                <input className="border rounded px-2 py-2 w-full mt-1" value={qty} onChange={(e) => setQty(e.target.value)} />
              </label>
              <label className="block mb-2">Shelf location
                <input className="border rounded px-2 py-2 w-full mt-1" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="A-01" />
              </label>
              <button onClick={save} disabled={saving} className="bg-blue-700 text-white px-4 py-2 rounded w-full disabled:opacity-50">{saving ? 'Saving...' : 'Save Quantity'}</button>
            </div>
          ) : <div className="text-sm text-gray-400">Select a product from the list.</div>}
        </div>
        <div className="border rounded-xl p-3 bg-white overflow-auto">
          <div className="font-bold text-lg mb-2">2. Inventory List</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100"><tr><th className="p-2 text-left">Part No.</th><th className="p-2 text-left">Brand</th><th className="p-2 text-left">Name</th><th className="p-2 text-right">Qty</th><th className="p-2 text-left">Shelf</th><th className="p-2 text-right">Selling</th></tr></thead>
            <tbody>
              {shown.slice(0, 200).map((p) => {
                const qtyNow = Number(stock[p.id]?.qty || 0);
                return (
                  <tr key={p.id} className="border-t cursor-pointer hover:bg-blue-50" onClick={() => pick(p)}>
                    <td className="p-2">{p.partNumber}</td>
                    <td className="p-2">{p.brand || '—'}</td>
                    <td className="p-2">{p.name}</td>
                    <td className={`p-2 text-right font-bold ${qtyNow <= 5 ? 'text-red-600' : ''}`}>{qtyNow}</td>
                    <td className="p-2">{stock[p.id]?.location || '—'}</td>
                    <td className="p-2 text-right">{money(p.sellingPrice || 0)}</td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
