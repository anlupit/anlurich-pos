'use client';

import { useEffect, useRef, useState } from 'react';
import { currentBranch, setStockQty } from '../lib/branchData';
import { loadProductsCloud } from '../lib/products';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const empty = () => ({ id: Date.now().toString(), barcode: '', partNumber: '', description: '', amount: '', commission: '', qty: '1' });

export default function OnlineSale({ source }: { source: 'lazada' | 'shopee' }) {
  const [customerName, setCustomerName] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [lines, setLines] = useState([empty()]);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const savingRef = useRef(false);
  const title = source === 'lazada' ? 'Lazada Sale' : 'Shopee Sales';
  const color = source === 'lazada' ? '#0f146d' : '#ee4d2d';
  const lineTotal = (l: { amount: string; qty: string }) => (Number(l.amount) || 0) * (Number(l.qty) || 0);
  const total = lines.reduce((n, l) => n + lineTotal(l), 0);
  const commission = lines.reduce((n, l) => n + (Number(l.commission) || 0), 0);

  useEffect(() => {
    const branch = currentBranch() || '';
    fetch(`/api/records?table=${source}_sales&branch=${branch}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setRows([]));
  }, [source]);

  const save = async () => {
    if (savingRef.current) return;
    if (!customerName.trim() || !orderNo.trim()) return alert('Enter customer name and order number.');
    const valid = lines.filter((l) => l.partNumber.trim() && Number(l.qty) > 0);
    if (!valid.length) return alert('Add at least one part.');
    savingRef.current = true;
    setSaving(true);
    const branch = currentBranch() || 'unknown';
    const row = { id: `${branch}-${source}-${orderNo.trim()}`, branch, source, customerName: customerName.trim(), orderNo: orderNo.trim(), lines: valid, total, commission, createdAt: new Date().toISOString() };
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: `${source}_sales`, row }) });
    const products = await loadProductsCloud().catch(() => []);
    for (const l of valid) {
      const found = products.find((p: any) => String(p.partNumber || '').toLowerCase() === l.partNumber.toLowerCase());
      if (found) setStockQty(found.id, Math.max(0, Number(found.qty || 0) - Number(l.qty || 0)), '', branch);
    }
    setCustomerName('');
    setOrderNo('');
    setLines([empty()]);
    setRows((prev) => [row, ...prev]);
    savingRef.current = false;
    setSaving(false);
    alert(`${title} saved.`);
  };

  return (
    <div className="p-3 md:p-4">
      <div className="text-white rounded-xl px-4 py-3 mb-3 flex items-center justify-between" style={{ background: color }}>
        <div>
          <div className="text-xs opacity-80">{currentBranch()?.toUpperCase()}</div>
          <h1 className="text-2xl font-black">{title}</h1>
        </div>
        <div className="text-right font-black text-xl">TOTAL {money(total)}</div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Customer Name</label>
          <input className="border rounded-lg px-3 py-2 w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Order Number</label>
          <input className="border rounded-lg px-3 py-2 w-full" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead className="text-white" style={{ background: color }}>
            <tr>
              <th className="p-2 text-left">Barcode</th>
              <th className="p-2 text-left">Part Number</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-right">Commission</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-1"><input className="border rounded px-2 py-2 w-full" value={l.barcode} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, barcode: e.target.value } : x))} /></td>
                <td className="p-1"><input className="border rounded px-2 py-2 w-full" value={l.partNumber} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, partNumber: e.target.value } : x))} /></td>
                <td className="p-1"><input className="border rounded px-2 py-2 w-24 text-right" value={l.amount} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, amount: e.target.value } : x))} /></td>
                <td className="p-1"><input className="border rounded px-2 py-2 w-24 text-right" value={l.commission} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, commission: e.target.value } : x))} /></td>
                <td className="p-1"><input className="border rounded px-2 py-2 w-16 text-center" value={l.qty} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, qty: e.target.value } : x))} /></td>
                <td className="p-2 text-right font-bold">{money(lineTotal(l))}</td>
                <td className="p-1"><button onClick={() => setLines(lines.filter((x) => x.id !== l.id))} className="bg-red-600 text-white rounded px-2 py-1">X</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => setLines([...lines, empty()])} className="bg-blue-700 text-white rounded-lg px-4 py-2 font-bold">+ Add Line</button>
        <button onClick={save} disabled={saving} className="text-white rounded-lg px-6 py-2 font-bold disabled:opacity-50" style={{ background: color }}>{saving ? 'Saving...' : 'Save Sale'}</button>
        <div className="ml-auto text-right">
          <div>Commission {money(commission)}</div>
          <div className="text-xl font-black">TOTAL {money(total)}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="font-bold mb-2">Saved {title}</div>
        {rows.length === 0 && <div className="text-gray-500">No {title} yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="border-b py-2 flex justify-between">
            <div><div className="font-bold">{r.orderNo}</div><div>{r.customerName}</div></div>
            <div className="text-right">{money(r.returned ? r.originalTotal || r.total : r.total)}{r.returned ? ` · Returned ${money(r.returnedAmount || 0)}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
