'use client';

import { useEffect, useState } from 'react';
import { currentBranch, formatDate } from '../../lib/branchData';

export default function ActivityPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch('/api/data?key=anlurich-activity-log', { cache: 'no-store' })
      .then((r) => r.json())
      .then((rows) => {
        const row = Array.isArray(rows) ? rows.find((x: any) => x.key === 'anlurich-activity-log') : null;
        const list = row?.value ? JSON.parse(row.value) : [];
        setRows(Array.isArray(list) ? list : []);
      })
      .catch(() => setRows([]));
  }, []);

  const filtered = rows.filter((r) => {
    const text = `${r.who || ''} ${r.action || ''} ${r.invoiceNo || ''} ${r.detail || ''}`.toLowerCase();
    return !q || text.includes(q.toLowerCase());
  });

  const goBack = () => {
    const b = currentBranch();
    window.location.href = b && b !== 'admin' ? `/branch/${b}` : b === 'admin' ? '/admin' : '/';
  };

  return (
    <div className="min-h-screen p-4 overflow-x-hidden">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-yellow-600">Activity Log</h1>
        <button onClick={goBack} className="text-blue-600 text-sm">← Back to Dashboard</button>
      </div>
      <input className="border rounded px-2 py-1 mb-3" placeholder="Search who, invoice, action" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">When</th>
              <th className="text-left p-2">Who</th>
              <th className="text-left p-2">Branch</th>
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">Invoice</th>
              <th className="text-left p-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{formatDate(r.when)} {String(r.when || '').slice(11, 16)}</td>
                <td className="p-2">{r.who}</td>
                <td className="p-2">{r.branch}</td>
                <td className="p-2">{r.action}</td>
                <td className="p-2">{r.invoiceNo || '—'}</td>
                <td className="p-2">{r.detail || ''}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-500">No activity yet. Saves, edits, and deletes will appear here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
