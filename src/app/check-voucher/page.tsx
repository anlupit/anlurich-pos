'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '../../lib/branchData';

const BRANCHES = [
  { id: 'anlurich', name: 'ANLURICH OPC' },
  { id: 'avenders', name: 'Avenders' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
  { id: 'sezan', name: 'Sezan' },
  { id: 'timitsu', name: 'Timitsu' },
];

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type CheckLine = { id: string; date: string; bank: string; no: string; amount: string };

export default function CheckVoucherPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [supplier, setSupplier] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [checks, setChecks] = useState<CheckLine[]>([{ id: '1', date: new Date().toISOString().slice(0, 10), bank: '', no: '', amount: '' }]);
  const [credits, setCredits] = useState<any[]>([]);
  const [tab, setTab] = useState<'pay' | 'credit'>('pay');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('anlurich-branch');
    if (id !== 'admin') {
      alert('Check Voucher is for ADMIN only');
      window.location.href = '/admin';
      return;
    }
    const load = async () => {
      try {
        const res = await fetch('/api/data', { cache: 'no-store' });
        const rows: { key: string; value: string }[] = res.ok ? await res.json() : [];
        const get = (key: string) => {
          const row = rows.find((r) => r.key === key);
          return row?.value ? JSON.parse(row.value) : [];
        };
        const all = BRANCHES.flatMap((b) => {
          const list = get(`anlurich-supplier-invoices-${b.id}`);
          return Array.isArray(list) ? list.map((i, idx) => ({ ...i, id: i.id || `${b.id}-${idx}`, branch: i.branch || b.id })) : [];
        });
        setInvoices(all);
        setCredits(JSON.parse(localStorage.getItem('anlurich-credit-memos') || '[]'));
      } catch {}
    };
    load();
  }, []);

  const list = invoices.filter((i) => {
    const unpaid = String(i.status || '').toLowerCase() !== 'paid' && i.paid !== true;
    const monthOk = !month || String(i.invoiceDate || i.createdAt || '').startsWith(month);
    const supplierOk = !supplier.trim() || String(i.supplierName || '').toLowerCase().includes(supplier.trim().toLowerCase());
    return unpaid && monthOk && supplierOk;
  });

  const chosen = list.filter((i) => selected.includes(i.id));
  const isSales = (i: any) => String(i.invoiceType || '').toLowerCase().includes('sales');
  const siTotal = chosen.filter(isSales).reduce((n, i) => n + Number(i.grandTotal || 0), 0);
  const drTotal = chosen.filter((i) => !isSales(i)).reduce((n, i) => n + Number(i.grandTotal || 0), 0);
  const ewt = (siTotal / 1.12) * 0.01;
  const checkAmount = siTotal - ewt + drTotal;
  const checksTotal = checks.reduce((n, c) => n + (parseFloat(c.amount) || 0), 0);

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const addCheck = () => setChecks((prev) => [...prev, { id: Date.now().toString(), date: new Date().toISOString().slice(0, 10), bank: '', no: '', amount: '' }]);
  const updateCheck = (id: string, field: keyof CheckLine, value: string) => setChecks((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));

  const saveSchedule = () => {
    if (!chosen.length) return alert('Select invoices to pay');
    if (Math.abs(checksTotal - checkAmount) > 0.05) return alert(`Check total must equal ${money(checkAmount)}`);
    const schedule = {
      id: Date.now().toString(),
      supplier: chosen[0]?.supplierName,
      invoices: chosen.map((i) => i.invoiceNumber || i.invoiceNo),
      siTotal,
      drTotal,
      ewt,
      checkAmount,
      checks,
      date: new Date().toISOString(),
    };
    const all = JSON.parse(localStorage.getItem('anlurich-check-schedules') || '[]');
    localStorage.setItem('anlurich-check-schedules', JSON.stringify([schedule, ...all]));
    setSaved(true);
    alert('Check schedule saved.');
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">Check Voucher</h1>
      <p className="text-gray-500 mb-4">All branches — select unpaid supplier invoices</p>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('pay')} className={`px-4 py-2 rounded ${tab === 'pay' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}>To Pay</button>
        <button onClick={() => setTab('credit')} className={`px-4 py-2 rounded ${tab === 'credit' ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>Credit Memo ({credits.length})</button>
      </div>
      {tab === 'credit' ? (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          {credits.length === 0 ? <p className="p-4 text-gray-500">No credit memos.</p> : (
            <table className="w-full text-sm">
              <thead className="bg-orange-100"><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Supplier</th><th className="text-left p-2">Invoice</th><th className="text-left p-2">Part</th><th className="text-right p-2">Amount</th></tr></thead>
              <tbody>
                {credits.map((c) => (
                  <tr key={c.id} className="border-t"><td className="p-2">{formatDate(c.date)}</td><td className="p-2">{c.supplierName}</td><td className="p-2">{c.invoiceNo}</td><td className="p-2">{c.partNumber}</td><td className="p-2 text-right">{money(c.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
      <>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input type="month" className="border rounded px-3 py-2" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Supplier</label>
          <input className="border rounded px-3 py-2" placeholder="Supplier name" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="p-2"></th>
              <th className="text-left p-2">Branch</th>
              <th className="text-left p-2">Supplier</th>
              <th className="text-left p-2">Invoice No.</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Date</th>
              <th className="text-right p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {list.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-2 text-center"><input type="checkbox" checked={selected.includes(inv.id)} onChange={() => toggle(inv.id)} /></td>
                <td className="p-2">{inv.branch}</td>
                <td className="p-2">{inv.supplierName}</td>
                <td className="p-2">{inv.invoiceNumber || inv.invoiceNo}</td>
                <td className="p-2">{inv.invoiceType || '—'}</td>
                <td className="p-2">{formatDate(inv.invoiceDate)}</td>
                <td className="p-2 text-right">{money(inv.grandTotal)}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-400">No unpaid invoices for this month</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 text-right space-y-1">
        <div>Sales Invoice Total: {money(siTotal)}</div>
        <div>1% EWT (Sales Invoice only): {money(ewt)}</div>
        <div>DR Invoice Total (no EWT): {money(drTotal)}</div>
        <div className="text-lg font-bold">Check Amount: {money(checkAmount)}</div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="font-semibold mb-2">Check Schedule</div>
        {checks.map((c) => (
          <div key={c.id} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input type="date" className="border rounded px-2 py-1" value={c.date} onChange={(e) => updateCheck(c.id, 'date', e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Bank" value={c.bank} onChange={(e) => updateCheck(c.id, 'bank', e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Check No." value={c.no} onChange={(e) => updateCheck(c.id, 'no', e.target.value)} />
            <input type="number" className="border rounded px-2 py-1 text-right" placeholder="Check Amount" value={c.amount} onChange={(e) => updateCheck(c.id, 'amount', e.target.value)} />
          </div>
        ))}
        <button onClick={addCheck} className="bg-gray-700 text-white px-4 py-2 rounded mr-2">Add Check</button>
        <button onClick={saveSchedule} className="bg-blue-700 text-white px-4 py-2 rounded">Save Schedule</button>
        <div className="text-right font-bold mt-3">Total Checks Issued: {money(checksTotal)}</div>
        {saved && <div className="text-green-700 text-sm mt-2">Schedule saved.</div>}
      </div>
      </>
      )}
    </div>
  );
}
