'use client';

import { useEffect, useState } from 'react';
import { currentBranch, formatDate, loadStockHistory } from '../../lib/branchData';

export default function StockHistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('');

  useEffect(() => {
    loadStockHistory().then(setRows);
  }, []);

  const filtered = rows.filter((r) => {
    const text = `${r.partNumber || ''} ${r.name || ''} ${r.brand || ''} ${r.reason || ''}`.toLowerCase();
    const branchOk = !branch || String(r.branch || '').toLowerCase() === branch.toLowerCase();
    return branchOk && (!q || text.includes(q.toLowerCase()));
  });

  const goBack = () => {
    const b = currentBranch();
    window.location.href = b && b !== 'admin' ? `/branch/${b}` : b === 'admin' ? '/admin' : '/';
  };

  return (
    <div className="min-h-screen p-4 overflow-x-hidden">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-yellow-600">Stock History</h1>
        <button onClick={goBack} className="text-blue-600 text-sm">← Back to Dashboard</button>
      </div>
      <div className="flex gap-2 mb-3">
        <input className="border rounded px-2 py-1" placeholder="Search part, name, brand" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="border rounded px-2 py-1" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">All branches</option>
          <option value="anlurich">Anlurich</option>
          <option value="dasma">Dasma</option>
          <option value="sezan">Sezan</option>
          <option value="timitsu">Timitsu</option>
          <option value="avenders">Avenders</option>
          <option value="lipa">Lipa</option>
        </select>
        <div className="text-sm text-gray-500 self-center">{filtered.length} records</div>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Branch</th>
              <th className="text-left p-2">Part Number</th>
              <th className="text-left p-2">Brand</th>
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Old Qty</th>
              <th className="text-right p-2">Change</th>
              <th className="text-right p-2">New Qty</th>
              <th className="text-left p-2">Reason</th>
              <th className="text-left p-2">Who</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{formatDate(r.when)} {String(r.when || '').slice(11, 16)}</td>
                <td className="p-2">{r.branch}</td>
                <td className="p-2">{r.partNumber}</td>
                <td className="p-2">{r.brand || '—'}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-right">{r.oldQty}</td>
                <td className={`p-2 text-right ${Number(r.change) < 0 ? 'text-red-600' : 'text-green-700'}`}>{r.change}</td>
                <td className="p-2 text-right font-medium">{r.newQty}</td>
                <td className="p-2">{r.reason}</td>
                <td className="p-2">{r.who}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} className="p-4 text-center text-gray-500">No stock changes recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
