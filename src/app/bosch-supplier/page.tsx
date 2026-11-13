'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

type Tool = { id: string; partNumber: string; name: string; category: string; description: string; costPrice: number; sellingPrice: number; qty: number };
type Line = { id: string; barcode: string; model: string; partNumber: string; segment: string; power: string; capacity: string; qty: number; price: number };
const SEGMENTS = ['Accessories', 'Blue', 'COC', 'Garden', 'Measuring', 'Parts and Handtools'];
const emptyLine = (): Line => ({ id: Date.now().toString(), barcode: '', model: '', partNumber: '', segment: '', power: '', capacity: '', qty: 1, price: 0 });

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function loadTools(): Promise<Tool[]> {
  const res = await fetch('/api/records?table=bosch_products', { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}
async function saveTool(row: Tool) {
  const res = await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'bosch_products', row }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw new Error(body.error || 'Supabase did not save the Bosch catalog quantity');
}
async function loadInvoices() {
  const res = await fetch('/api/records?table=bosch_invoices', { cache: 'no-store' });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}
async function saveBoschInvoice(row: any) {
  await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'bosch_invoices', row }) });
}

export default function BoschSupplierInvoicePage() {
  const [allowed, setAllowed] = useState(false);
  const [catalog, setCatalog] = useState<Tool[]>([]);
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [suggest, setSuggest] = useState<{ id: string; matches: Tool[] } | null>(null);

  useEffect(() => {
    const branch = (currentBranch() || '').toLowerCase();
    if (branch !== 'anlurich' && branch !== 'admin') {
      alert('Bosch supplier invoice is for Anlurich only.');
      window.location.href = '/';
      return;
    }
    setAllowed(true);
    loadTools().then(setCatalog);
  }, []);

  const suggestFor = (id: string, text: string) => {
    const q = text.trim().toLowerCase();
    if (q.length < 2) return setSuggest(null);
    const matches = catalog.filter((p) => `${p.partNumber} ${p.name}`.toLowerCase().includes(q)).slice(0, 8);
    setSuggest(matches.length ? { id, matches } : null);
  };

  const pick = (id: string, p: Tool) => {
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, partNumber: p.partNumber, model: p.name, price: p.costPrice || 0 } : l));
    setSuggest(null);
  };

  const total = lines.reduce((n, l) => n + l.qty * l.price, 0);

  const save = async () => {
    if (saving) return;
    if (!supplier.trim()) return alert('Enter supplier name');
    if (!invoiceNo.trim()) return alert('Enter invoice number');
    const valid = lines.filter((l) => l.partNumber.trim() && l.qty > 0);
    if (!valid.length) return alert('Add at least one item');
    setSaving(true);
    const invoices = await loadInvoices();
    if (invoices.some((i: any) => String(i.supplier).toLowerCase() === supplier.trim().toLowerCase() && String(i.invoiceNo).toLowerCase() === invoiceNo.trim().toLowerCase())) {
      setSaving(false);
      return alert('This Bosch invoice is already recorded.');
    }
    const invoice = { id: Date.now().toString(), branch: 'anlurich', supplier: supplier.trim(), invoiceNo: invoiceNo.trim(), date, lines: valid, total, createdAt: new Date().toISOString() };
    await saveBoschInvoice(invoice);
    const latest = await loadTools();
    const tools = [...latest];
    const added: string[] = [];
    valid.forEach((l) => {
      const found = tools.find((p) => p.partNumber.toLowerCase() === l.partNumber.toLowerCase());
      if (found) {
        found.qty = Number(found.qty || 0) + Number(l.qty || 0);
        if (l.price > 0) found.costPrice = l.price;
        if (l.model) found.name = l.model;
        if (l.barcode) (found as any).barcode = l.barcode;
        if (l.segment) found.category = l.segment;
        (found as any).power = l.power;
        (found as any).capacity = l.capacity;
        added.push(`${found.partNumber}: +${l.qty} = ${found.qty}`);
      } else {
        const item = { id: Date.now().toString() + l.partNumber, partNumber: l.partNumber, name: l.model || l.partNumber, category: l.segment || '', description: l.model || '', costPrice: l.price, sellingPrice: l.price ? Math.ceil((l.price * 1.5) / 100) * 100 : 0, qty: Number(l.qty || 0), barcode: l.barcode, power: l.power, capacity: l.capacity };
        tools.push(item);
        added.push(`${item.partNumber}: +${item.qty} = ${item.qty}`);
      }
    });
    setCatalog(tools);
    try {
      await Promise.all(valid.map((l) => {
        const saved = tools.find((p) => p.partNumber.toLowerCase() === l.partNumber.toLowerCase());
        return saved ? saveTool(saved) : Promise.resolve();
      }));
    } catch (err: any) {
      setSaving(false);
      return alert(err?.message || 'Invoice saved, but Bosch catalog quantity was not saved to Supabase.');
    }
    setSupplier('');
    setInvoiceNo('');
    setDate(new Date().toISOString().slice(0, 10));
    setLines([emptyLine()]);
    setSaving(false);
    alert(`Bosch supplier invoice saved.\nCatalog stock updated:\n${added.join('\n')}`);
  };

  if (!allowed) return null;
  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <img src="/logo.png" alt="Anlurich" className="h-16 mx-auto object-contain" />
        <div className="font-bold text-lg">Auto Parts Inventory</div>
        <div className="text-2xl font-black mt-1" style={{ color: '#002366' }}>Bosch Supplier Invoice</div>
      </div>
      <p className="text-sm text-gray-500 mb-4">Anlurich only. Adds stock to the Bosch catalog.</p>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-2">
        <input className="border rounded px-3 py-2" placeholder="Supplier name" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Invoice number" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        <input type="date" className="border rounded px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="text-white" style={{ background: '#002366' }}>
            <tr>
              <th className="p-2 text-left">Barcode</th>
              <th className="p-2 text-left">Model</th>
              <th className="p-2 text-left">Part Number</th>
              <th className="p-2 text-left">Segment</th>
              <th className="p-2 text-left">Power</th>
              <th className="p-2 text-left">Capacity</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-1"><input className="border rounded px-1 py-1" style={{ width: '20ch' }} value={l.barcode} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, barcode: e.target.value } : x))} /></td>
                <td className="p-1"><input className="border rounded px-1 py-1" style={{ width: '20ch' }} value={l.model} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, model: e.target.value } : x))} /></td>
                <td className="p-1 relative">
                  <input className="border rounded px-1 py-1" style={{ width: '20ch' }} value={l.partNumber} onChange={(e) => { setLines(lines.map((x) => x.id === l.id ? { ...x, partNumber: e.target.value } : x)); suggestFor(l.id, e.target.value); }} />
                  {suggest?.id === l.id && (
                    <div className="absolute z-20 bg-white border rounded shadow max-h-40 overflow-auto">
                      {suggest.matches.map((p) => <button type="button" key={p.id} className="block w-full text-left px-2 py-1 hover:bg-blue-50" onMouseDown={() => pick(l.id, p)}>{p.partNumber} · {p.name}</button>)}
                    </div>
                  )}
                </td>
                <td className="p-1">
                  <select className="border rounded px-1 py-1" style={{ width: '18ch' }} value={l.segment} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, segment: e.target.value } : x))}>
                    <option value="">—</option>
                    {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-1"><input className="border rounded px-1 py-1" style={{ width: '10ch' }} value={l.power} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, power: e.target.value } : x))} /></td>
                <td className="p-1"><input className="border rounded px-1 py-1" style={{ width: '12ch' }} value={l.capacity} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, capacity: e.target.value } : x))} /></td>
                <td className="p-1 text-center"><input type="number" min={1} className="border rounded text-center" style={{ width: '6ch' }} value={l.qty} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, qty: parseInt(e.target.value) || 1 } : x))} /></td>
                <td className="p-1 text-right"><input type="number" className="border rounded text-right" style={{ width: '10ch' }} value={l.price || ''} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, price: parseFloat(e.target.value) || 0 } : x))} /></td>
                <td className="p-1 text-right">{money(l.qty * l.price)}</td>
                <td className="p-1 text-right"><button onClick={() => setLines(lines.length === 1 ? [emptyLine()] : lines.filter((x) => x.id !== l.id))} className="text-red-600">X</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setLines([...lines, emptyLine()])} className="m-2 bg-gray-700 text-white px-3 py-1 rounded">+ Add Line</button>
      </div>
      <div className="text-xl font-black mb-3">Total {money(total)}</div>
      <button onClick={save} disabled={saving} className="text-white px-6 py-3 rounded-lg font-bold disabled:opacity-60" style={{ background: '#002366' }}>{saving ? 'SAVING...' : 'SAVE BOSCH INVOICE'}</button>
    </div>
  );
}
