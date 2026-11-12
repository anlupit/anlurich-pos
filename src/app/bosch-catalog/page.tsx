'use client';

import { useEffect, useRef, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

type Tool = { id: string; partNumber: string; name: string; category: string; description: string; costPrice: number; sellingPrice: number; qty: number };

const KEY = 'anlurich-bosch-products';
const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function loadTools(): Promise<Tool[]> {
  const res = await fetch('/api/records?table=bosch_products', { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}
async function saveTool(row: Tool) {
  await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'bosch_products', row }) });
}
async function deleteTool(id: string) {
  await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'bosch_products', deleteId: id }) });
}

export default function BoschCatalogPage() {
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Tool[]>([]);
  const [form, setForm] = useState({ partNumber: '', name: '', category: '', description: '', costPrice: '', sellingPrice: '', qty: '0' });
  const [editing, setEditing] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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
    await saveTool(item);
    setForm({ partNumber: '', name: '', category: '', description: '', costPrice: '', sellingPrice: '', qty: '0' });
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this Bosch item?')) return;
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    await deleteTool(id);
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Part Number', 'Name', 'Category', 'Description', 'Cost', 'Selling', 'Qty'],
      ['06019F6000', 'Drill GSB 13 RE', 'Drills', 'Impact drill 600W', 2500, 3990, 5],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Bosch');
    XLSX.writeFile(wb, 'bosch-catalog-template.xlsx');
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const incoming: any[] = XLSX.utils.sheet_to_json(sheet);
    const text = (row: any, names: string[]) => {
      const keys = Object.keys(row);
      const want = names.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const key = keys.find((k) => want.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
      return key ? String(row[key] ?? '').trim() : '';
    };
    const num = (row: any, names: string[]) => {
      const raw = text(row, names).replace(/[^0-9.]/g, '');
      return raw ? Number(raw) : 0;
    };
    const items = incoming.map((r, i) => ({
      id: Date.now().toString() + i,
      partNumber: text(r, ['Part Number', 'Part No']),
      name: text(r, ['Name', 'Product Name']),
      category: text(r, ['Category']),
      description: text(r, ['Description']),
      costPrice: num(r, ['Cost', 'Cost Price']),
      sellingPrice: num(r, ['Selling', 'Selling Price']),
      qty: num(r, ['Qty', 'Quantity']),
    })).filter((r) => r.partNumber && r.name);
    if (!items.length) return alert('No valid rows. Need Part Number and Name.');
    const next = [...rows];
    let added = 0;
    let updated = 0;
    for (const item of items) {
      const index = next.findIndex((p) => p.partNumber.toLowerCase() === item.partNumber.toLowerCase());
      if (index >= 0) {
        const merged = { ...next[index], ...item, id: next[index].id };
        next[index] = merged;
        await saveTool(merged);
        updated += 1;
      } else {
        next.push(item);
        await saveTool(item);
        added += 1;
      }
    }
    setRows(next);
    if (fileRef.current) fileRef.current.value = '';
    alert(`Saved to Supabase. Added ${added}, updated ${updated}.`);
  };

  const shown = rows.filter((r) => `${r.partNumber} ${r.name} ${r.category} ${r.description}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name) || a.partNumber.localeCompare(b.partNumber));

  return (
    <div className="p-4 min-h-screen" style={{ background: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 28%, #e0f2fe 55%, #ffffff 100%)' }}>
      <h1 className="text-2xl font-bold" style={{ color: '#4169e1' }}>Bosch Catalog</h1>
      <p className="text-sm text-gray-600 mb-4">Shared by Anlurich and Baliwag Auto Parts. Not mixed with auto parts.</p>
      <div className="bg-white/80 rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Part Number *" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Product Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input type="number" className="border rounded px-3 py-2" placeholder="Cost" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
        <input type="number" className="border rounded px-3 py-2" placeholder="Selling" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
        <input type="number" className="border rounded px-3 py-2" placeholder="Qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        <button onClick={save} className="text-white rounded px-3 py-2" style={{ background: '#7aa2f7' }}>{editing ? 'Update' : 'Add Bosch Item'}</button>
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={downloadTemplate} className="text-white px-4 py-2 rounded" style={{ background: '#4169e1' }}>Download Template</button>
        <label className="text-white px-4 py-2 rounded cursor-pointer" style={{ background: '#7aa2f7' }}>
          Mass Upload Excel
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcel} />
        </label>
      </div>
      <input className="border rounded px-3 py-2 mb-3" placeholder="Search part, name, category" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white" style={{ background: '#7aa2f7' }}>
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
