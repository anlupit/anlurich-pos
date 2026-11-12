'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';
import { saveSale } from '../../lib/branchData';

type Tool = { id: string; partNumber: string; name: string; category: string; description: string; costPrice: number; sellingPrice: number; qty: number };
type Line = { id: string; partNumber: string; name: string; qty: number; price: number };

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

export default function BoschPOSPage() {
  const [allowed, setAllowed] = useState(false);
  const [catalog, setCatalog] = useState<Tool[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [payment, setPayment] = useState('Cash');
  const [tendered, setTendered] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const branch = (currentBranch() || '').toLowerCase();
    if (!['anlurich', 'sezan', 'admin'].includes(branch)) {
      alert('Bosch Power Tools is only for Anlurich and Baliwag Auto Parts.');
      window.location.href = '/';
      return;
    }
    setAllowed(true);
    loadTools().then(setCatalog);
  }, []);

  const matches = q.trim().length >= 2
    ? catalog.filter((p) => `${p.partNumber} ${p.name} ${p.category}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];

  const add = (p: Tool) => {
    setLines((prev) => {
      const found = prev.find((l) => l.partNumber === p.partNumber);
      if (found) return prev.map((l) => l.partNumber === p.partNumber ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { id: Date.now().toString(), partNumber: p.partNumber, name: p.name, qty: 1, price: p.sellingPrice || 0 }];
    });
    setQ('');
  };

  const total = lines.reduce((n, l) => n + l.qty * l.price, 0);
  const change = (parseFloat(tendered) || 0) - total;

  const save = async () => {
    if (saving) return;
    if (!lines.length) return alert('Add a Bosch item first');
    setSaving(true);
    const branch = currentBranch() || 'unknown';
    const sale = {
      id: Date.now().toString(),
      branch,
      source: 'bosch',
      date: new Date().toISOString().slice(0, 10),
      dateTime: new Date().toISOString(),
      invoiceNo: `BOSCH-${Date.now().toString().slice(-6)}`,
      customerName: customer.trim(),
      customerPhone: phone.trim(),
      paymentMethod: payment,
      cashTender: parseFloat(tendered) || 0,
      change: change > 0 ? change : 0,
      total,
      items: lines.map((l) => ({ partNumber: l.partNumber, description: l.name, brand: 'Bosch', qty: l.qty, price: l.price, labor: 0 })),
    };
    try {
      await saveSale(sale);
      await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'bosch_sales', row: sale }) });
    } catch {
      setSaving(false);
      return alert('Sale was not saved. Check the cloud connection.');
    }
    const next = catalog.map((p) => {
      const sold = lines.find((l) => l.partNumber === p.partNumber);
      return sold ? { ...p, qty: Math.max(0, Number(p.qty || 0) - sold.qty) } : p;
    });
    setCatalog(next);
    await Promise.all(next.filter((p) => lines.some((l) => l.partNumber === p.partNumber)).map((p) => saveTool(p))).catch(() => {});
    setLines([]);
    setCustomer('');
    setPhone('');
    setTendered('');
    setSaving(false);
    alert(`Bosch sale saved. Invoice ${sale.invoiceNo}`);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-red-700">Bosch Power Tools POS</h1>
      <p className="text-sm text-gray-500 mb-4">Shared Bosch catalog for Anlurich and Baliwag Auto Parts</p>
      <div className="bg-white rounded-xl shadow p-4 mb-4 relative">
        <input className="w-full border rounded px-3 py-2" placeholder="Type 2 letters of part number or name" value={q} onChange={(e) => setQ(e.target.value)} />
        {matches.length > 0 && (
          <div className="absolute z-20 left-4 right-4 bg-white border rounded shadow max-h-48 overflow-auto">
            {matches.map((p) => (
              <button type="button" key={p.id} className="block w-full text-left px-3 py-2 hover:bg-red-50" onClick={() => add(p)}>
                <div className="font-medium">{p.partNumber} · {p.name}</div>
                <div className="text-sm text-gray-500">{p.category} · Stock {p.qty} · {money(p.sellingPrice)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-red-700 text-white"><tr><th className="p-2 text-left">Part</th><th className="p-2 text-left">Name</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th><th></th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.partNumber}</td>
                <td className="p-2">{l.name}</td>
                <td className="p-2 text-center"><input type="number" min={1} className="w-16 border rounded text-center" value={l.qty} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, qty: parseInt(e.target.value) || 1 } : x))} /></td>
                <td className="p-2 text-right"><input type="number" className="w-28 border rounded text-right" value={l.price} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, price: parseFloat(e.target.value) || 0 } : x))} /></td>
                <td className="p-2 text-right">{money(l.qty * l.price)}</td>
                <td className="p-2 text-right"><button onClick={() => setLines(lines.filter((x) => x.id !== l.id))} className="text-red-600">X</button></td>
              </tr>
            ))}
            {lines.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No items</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <select className="border rounded px-3 py-2" value={payment} onChange={(e) => setPayment(e.target.value)}>
          <option>Cash</option><option>GCash</option><option>Maya</option><option>Credit / Debit Card</option><option>Bank Transfer</option>
        </select>
        <input type="number" className="border rounded px-3 py-2" placeholder="Amount tendered" value={tendered} onChange={(e) => setTendered(e.target.value)} />
        <div className="text-xl font-black">Total {money(total)}</div>
        <div className="text-lg">Change {money(change > 0 ? change : 0)}</div>
        <button onClick={save} disabled={saving} className="md:col-span-2 bg-red-700 text-white py-3 rounded-lg font-bold disabled:opacity-60">{saving ? 'SAVING...' : 'SAVE BOSCH SALE'}</button>
      </div>
    </div>
  );
}
