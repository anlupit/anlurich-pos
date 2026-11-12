'use client';

import { useEffect, useState } from 'react';
import { currentBranch, formatDate, loadSales, loadSalesCloud, updateSales } from '../../lib/branchData';

export default function UnpaidPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [payCheck, setPayCheck] = useState({ no: '', bank: '', date: '' });
  const [tick, setTick] = useState(0);
  const [logo, setLogo] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const branch = currentBranch() || 'unknown';
  const unpaid = rows.filter((s) => s.paymentMethod === 'Credit' && s.paid === false && (!search.trim() || String(s.customerName || '').toLowerCase().includes(search.trim().toLowerCase())));
  const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    setLogo(localStorage.getItem('anlurich-index-logo') || '/logo.png');
    loadSalesCloud(branch).then((sales) => setRows(sales.length ? sales : loadSales(branch))).catch(() => setRows(loadSales(branch)));
  }, [tick]);

  const recordPayment = () => {
    if (!payCheck.no || !payCheck.bank || !payCheck.date) return alert('Enter check no., bank name, and check date');
    if (!selected.length) return alert('Select the invoices paid');
    const all = loadSales(branch);
    const updated = all.map((s) => selected.includes(s.id) ? { ...s, paid: true, paymentRef: payCheck.no, bankName: payCheck.bank, checkDate: payCheck.date, paidOn: new Date().toISOString() } : s);
    updateSales(branch, updated);
    setSelected([]);
    setPayCheck({ no: '', bank: '', date: '' });
    setTick((n) => n + 1);
    alert('Payment recorded. Selected invoices are now PAID and removed from unpaid.');
  };

  return (
    <div className="p-4" key={tick}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="Logo" className="w-14 h-14 object-contain" /> : null}
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
        </div>
        <div className="text-2xl md:text-4xl font-black text-gray-800">{formatDate(new Date().toISOString().slice(0, 10))}</div>
      </div>
      <div className="border-b-2 border-black mb-3" />
      <h2 className="text-xl font-bold text-yellow-600 mb-4">Unpaid Invoice List</h2>
      <div className="flex gap-2 mb-3">
        <input className="flex-1 border rounded px-3 py-2" placeholder="Search client name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={() => setSelected(unpaid.map((s) => s.id))} className="bg-blue-700 text-white px-4 py-2 rounded">Tick All</button>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-red-600 text-white">
            <tr>
              <th className="p-2"></th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Invoice</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">TIN</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {unpaid.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2"><input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))} /></td>
                <td className="p-2">{formatDate(s.date)}</td>
                <td className="p-2">{s.invoiceNo}</td>
                <td className="p-2">{s.customerName}</td>
                <td className="p-2">{s.tin}</td>
                <td className="p-2 text-right">{money(s.total)}</td>
              </tr>
            ))}
            {unpaid.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No unpaid invoices</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="text-right font-bold mt-3">Unpaid Total: {money(unpaid.reduce((n, s) => n + (Number(s.total) || 0), 0))}</div>
      <div className="bg-white rounded-xl shadow p-4 mt-4 max-w-xl">
        <div className="font-semibold mb-2">Record payment</div>
        <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Check No." value={payCheck.no} onChange={(e) => setPayCheck({ ...payCheck, no: e.target.value })} />
        <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Bank Name" value={payCheck.bank} onChange={(e) => setPayCheck({ ...payCheck, bank: e.target.value })} />
        <input type="date" className="w-full border rounded px-3 py-2 mb-3" value={payCheck.date} onChange={(e) => setPayCheck({ ...payCheck, date: e.target.value })} />
        <button onClick={recordPayment} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold">Record Payment</button>
      </div>
    </div>
  );
}
