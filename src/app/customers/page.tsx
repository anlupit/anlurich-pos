'use client';

import { useEffect, useState } from 'react';
import { currentBranch, saveCustomer, loadCustomersCloud } from '../../lib/branchData';

export default function CustomersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', plateNo: '', tin: '', vehicleType: '' });

  const load = () => loadCustomersCloud().then((r) => setRows(Array.isArray(r) ? r : []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return alert('Enter customer name');
    const branch = currentBranch() || 'unknown';
    await saveCustomer({
      id: `${branch}-${form.name.trim().toLowerCase()}-${form.phone.trim()}`,
      branch,
      name: form.name.trim(),
      phone: form.phone.trim(),
      plateNo: form.plateNo.trim(),
      tin: form.tin.trim(),
      vehicleType: form.vehicleType.trim(),
    });
    setForm({ name: '', phone: '', plateNo: '', tin: '', vehicleType: '' });
    load();
  };

  const filtered = rows.filter((r) => {
    const text = `${r.name || ''} ${r.phone || ''} ${r.plateNo || ''} ${r.tin || ''}`.toLowerCase();
    return !q || text.includes(q.toLowerCase());
  });

  const goBack = () => {
    const b = currentBranch();
    window.location.href = b && b !== 'admin' ? `/branch/${b}` : b === 'admin' ? '/admin' : '/';
  };

  return (
    <div className="min-h-screen p-4 overflow-x-hidden">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-yellow-600">Customer List</h1>
        <button onClick={goBack} className="text-blue-600 text-sm">← Back to Dashboard</button>
      </div>
      <div className="bg-white rounded-xl shadow p-4 mb-3 grid grid-cols-2 md:grid-cols-5 gap-2">
        <input className="border rounded px-2 py-1" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Plate No." value={form.plateNo} onChange={(e) => setForm({ ...form, plateNo: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="TIN" value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Vehicle" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
        <button onClick={save} className="bg-blue-700 text-white px-4 py-1 rounded-lg md:col-span-1">Save Customer</button>
      </div>
      <input className="border rounded px-2 py-1 mb-3" placeholder="Search name, phone, plate, TIN" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Phone</th>
              <th className="text-left p-2">Plate No.</th>
              <th className="text-left p-2">TIN</th>
              <th className="text-left p-2">Vehicle</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.phone || '—'}</td>
                <td className="p-2">{r.plateNo || '—'}</td>
                <td className="p-2">{r.tin || '—'}</td>
                <td className="p-2">{r.vehicleType || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No customers yet. Save one above, or encode a POS sale — it is saved automatically.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
