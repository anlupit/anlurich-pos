'use client';

import { useEffect, useState } from 'react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CreditPaymentPage() {
  const today = new Date();
  const [rows, setRows] = useState<any[]>([]);
  const [branch, setBranch] = useState('');
  const [query, setQuery] = useState('');
  const [fromMonth, setFromMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [toMonth, setToMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [selected, setSelected] = useState<string[]>([]);
  const [checkNo, setCheckNo] = useState('');
  const [checkAmount, setCheckAmount] = useState('');
  const [checkDate, setCheckDate] = useState(today.toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const b = localStorage.getItem('anlurich-branch') || '';
    setBranch(b);
    if (!b) return;
    fetch(`/api/records?table=sales&branch=${b}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setRows((Array.isArray(data) ? data : []).filter((s) => s.paymentMethod === 'Credit')))
      .catch(() => setRows([]));
  }, []);

  const shown = rows.filter((s) => {
    const month = String(s.date || s.dateTime || '').slice(0, 7);
    const inRange = !month || (month >= fromMonth && month <= toMonth);
    const text = `${s.invoiceNo || ''} ${s.customerName || ''}`.toLowerCase();
    return inRange && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });

  const stampPaid = async () => {
    if (!selected.length) return alert('Tick the invoices to stamp as paid.');
    if (!checkNo.trim() || !checkAmount || !checkDate) return alert('Enter check no., check amount, and check date.');
    setSaving(true);
    const picked = rows.filter((s) => selected.includes(s.id));
    for (const row of picked) {
      const updated = { ...row, paid: true, paidBy: 'Check', paymentRef: checkNo.trim(), checkAmount: Number(checkAmount) || 0, checkDate, paidOn: new Date().toISOString() };
      await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'sales', row: updated }) });
    }
    setRows((prev) => prev.map((s) => selected.includes(s.id) ? { ...s, paid: true, paidBy: 'Check', paymentRef: checkNo.trim(), checkAmount: Number(checkAmount) || 0, checkDate } : s));
    setSelected([]);
    setCheckNo('');
    setCheckAmount('');
    setSaving(false);
    alert('Invoices stamped as PAID.');
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-black text-[#1e3a8a] mb-3">Credit Payment Adjustment</h1>
      <div className="grid gap-3" style={{ gridTemplateColumns: '280px 1fr' }}>
        <div className="border rounded-xl p-3 bg-white">
          <div className="font-bold text-lg mb-2">1. Search</div>
          <label className="text-sm block mb-2">Customer or Invoice No.
            <input className="border rounded px-2 py-2 w-full mt-1" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or invoice no." />
          </label>
          <label className="text-sm block mb-2">Month From
            <input type="month" className="border rounded px-2 py-2 w-full mt-1" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
          </label>
          <label className="text-sm block mb-2">Month To
            <input type="month" className="border rounded px-2 py-2 w-full mt-1" value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
          </label>
          <div className="text-xs text-gray-500">Credit invoices only. Paid invoices stay marked for the next search.</div>
        </div>
        <div className="border rounded-xl p-3 bg-white">
          <div className="font-bold text-lg mb-2">2. Credit Invoices</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100"><tr><th className="p-2"></th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Invoice</th><th className="p-2 text-left">Customer</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Check No.</th></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2"><input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id))} /></td>
                  <td className="p-2">{String(s.date || '').slice(0, 10)}</td>
                  <td className="p-2">{s.invoiceNo}</td>
                  <td className="p-2">{s.customerName}</td>
                  <td className="p-2 text-right">{money(s.total)}</td>
                  <td className={`p-2 font-bold ${s.paid === false ? 'text-red-600' : 'text-green-700'}`}>{s.paid === false ? 'UNPAID' : 'PAID'}</td>
                  <td className="p-2">{s.paymentRef || '—'}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-400">No credit invoices for this search.</td></tr>}
            </tbody>
          </table>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <input className="border rounded px-2 py-2" placeholder="Check No." value={checkNo} onChange={(e) => setCheckNo(e.target.value)} />
            <input className="border rounded px-2 py-2" placeholder="Check Amount" value={checkAmount} onChange={(e) => setCheckAmount(e.target.value)} />
            <input type="date" className="border rounded px-2 py-2" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
          </div>
          <button onClick={stampPaid} disabled={saving} className="mt-3 bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">{saving ? 'Saving...' : 'Stamp Selected as Paid'}</button>
        </div>
      </div>
    </div>
  );
}
