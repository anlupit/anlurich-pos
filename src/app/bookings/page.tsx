'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

export default function BookingListPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [branch, setBranch] = useState('');

  const load = async (id: string) => {
    const res = await fetch(`/api/bookings?branch=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const data = await res.json().catch(() => []);
    setRows(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const id = currentBranch() || 'anlurich';
    setBranch(id);
    load(id);
  }, []);

  const update = async (row: any, status: string) => {
    await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...row, status }) });
    load(branch);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-3">Service Bookings</h1>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="p-2 text-center">Date</th>
              <th className="p-2 text-center">Time</th>
              <th className="p-2 text-center">Customer</th>
              <th className="p-2 text-center">Phone</th>
              <th className="p-2 text-center">Plate</th>
              <th className="p-2 text-center">Service</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 text-center">{r.date}</td>
                <td className="p-2 text-center">{r.time}</td>
                <td className="p-2 text-center">{r.customerName}</td>
                <td className="p-2 text-center">{r.phone}</td>
                <td className="p-2 text-center">{r.plateNo || '—'}</td>
                <td className="p-2 text-center">{r.service}</td>
                <td className="p-2 text-center font-bold">{r.status}</td>
                <td className="p-2 text-center">
                  <button onClick={() => update(r, 'Confirmed')} className="text-green-700 text-xs mr-2">Confirm</button>
                  <button onClick={() => update(r, 'Done')} className="text-blue-700 text-xs">Done</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
