'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

type Tool = { id: string; partNumber: string; name: string; category: string; description: string; costPrice: number; sellingPrice: number; qty: number };

const KEY = 'anlurich-bosch-products';
const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function loadTools(): Promise<Tool[]> {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) return JSON.parse(localStorage.getItem(KEY) || '[]');
    const rows: { key: string; value: string }[] = await res.json();
    const row = rows.find((r) => r.key === KEY);
    if (row?.value) { localStorage.setItem(KEY, row.value); return JSON.parse(row.value); }
  } catch {}
  return JSON.parse(localStorage.getItem(KEY) || '[]');
}
async function saveTools(rows: Tool[]) {
  const text = JSON.stringify(rows);
  localStorage.setItem(KEY, text);
  await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: KEY, value: text }) });
}

export default function BoschCatalogPage() {
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Tool[]>([]);
  const [form, setForm] = useState({ partNumber: '', name: '', category: '', description: '', costPrice: '', sellingPrice: '', qty: '0' });
  const [editing, setEditing] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    const branch = (currentBranch() || '').toLowerCase();
    if (!['anlurich', 'sezan', 'admin'].includes(branch)) {
      alert('Bosch Catalog is only for Anlurich and Baliwag Auto Parts.');
      window.location.href = '/';
      return;
    }
    setAllowed(true);
    loadTools().then(setRows);
  }, []);

  const save = async () => {
    if (!form.partNumber.trim() || !form.name.trim()) return alert('Part number and name are required');
    const item: Tool = {
      id: editing || Date.now().toString(),
      partNumber: form.partNumber.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      qty: Number(form.qty) || 0,
    };
    const next = editing ? rows.map((r) => r.id === editing ? item : r) : [...rows, item];
    setRows(next);
    await saveTools(next);
    setForm({ partNumber: '', name: '', category: '', description: '', costPrice: '', sellingPrice: '', qty: '0' });
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this Bosch item?')) return;
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    await saveTools(next);
  };

  const shown = rows.filter((r) => `${r.partNumber} ${r.name} ${r.category} ${r.description}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name) || a.partNumber.localeCompare(b.partNumber));

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-red-700">Bosch Catalog</h1>
      <p className="text-sm text-gray-500 mb-4">Shared by Anlurich and Baliwag Auto Parts. Not mixed with auto parts.</p>
      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Part Number *" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Product Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input type="number" className="border rounded px-3 py-2" placeholder="Cost" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
        <input type="number" className="border rounded px-3 py-2" placeholder="Selling" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
        <input type="number" className="border rounded px-3 py-2" placeholder="Qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        <button onClick={save} className="bg-red-700 text-white rounded px-3 py-2">{editing ? 'Update' : 'Add Bosch Item'}</button>
      </div>
      <input className="border rounded px-3 py-2 mb-3" placeholder="Search part, name, category" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-red-700 text-white">
            <tr>
              <th className="p-2 text-left">Part Number</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right">Cost</th>
              <th className="p-2 text-right">Selling</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.partNumber}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.category}</td>
                <td className="p-2">{r.description}</td>
                <td className="p-2 text-right">{money(r.costPrice)}</td>
                <td className="p-2 text-right">{money(r.sellingPrice)}</td>
                <td className="p-2 text-right">{r.qty}</td>
                <td className="p-2 text-right">
                  <button onClick={() => { setEditing(r.id); setForm({ partNumber: r.partNumber, name: r.name, category: r.category, description: r.description, costPrice: String(r.costPrice), sellingPrice: String(r.sellingPrice), qty: String(r.qty) }); }} className="text-blue-700 mr-2">Edit</button>
                  <button onClick={() => remove(r.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">No Bosch items yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
