'use client';

import { useState, useEffect } from 'react';
import { loadBranchSuppliers, saveBranchSuppliers, currentBranch } from '../../lib/branchData';

type Supplier = {
  id: string;
  name: string;
  address: string;
  tin?: string;
  contact?: string;
  phone?: string;
  email?: string;
};

export default function AddSupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({ name: '', address: '', tin: '', contact: '', phone: '', email: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [branch, setBranch] = useState('');

  useEffect(() => {
    const b = currentBranch();
    setBranch(b);
    setSuppliers(loadBranchSuppliers(b));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Supplier name is required');

    let updated: Supplier[];
    if (editingId) {
      updated = suppliers.map((s) => (s.id === editingId ? { ...s, ...form } : s));
    } else {
      updated = [...suppliers, { id: Date.now().toString(), ...form }];
    }
    setSuppliers(updated);
    saveBranchSuppliers(updated, branch);
    setForm({ name: '', address: '', tin: '', contact: '', phone: '', email: '' });
    setEditingId(null);
  };

  const handleEdit = (s: Supplier) => {
    setForm({ name: s.name, address: s.address, tin: s.tin || '', contact: s.contact || '', phone: s.phone || '', email: s.email || '' });
    setEditingId(s.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    saveBranchSuppliers(updated, branch);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Add Supplier</h1>
      <div className="text-xs text-gray-500 mb-4">Private for this branch only</div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="border rounded px-3 py-2" placeholder="Supplier Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="border rounded px-3 py-2" maxLength={20} placeholder="TIN No." value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
        <input className="border rounded px-3 py-2" maxLength={20} placeholder="Contact Person" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <input className="border rounded px-3 py-2" maxLength={20} placeholder="Contact Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="md:col-span-3 flex gap-2">
          <button type="submit" className="bg-green-600 text-white px-5 py-2 rounded-lg">{editingId ? 'Update' : 'Add Supplier'}</button>
          {editingId && (
            <>
              <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', address: '', tin: '', contact: '', phone: '', email: '' }); }} className="bg-gray-500 text-white px-5 py-2 rounded-lg">Cancel</button>
              <button type="button" onClick={() => { handleDelete(editingId); setEditingId(null); setForm({ name: '', address: '', tin: '', contact: '', phone: '', email: '' }); }} className="bg-red-600 text-white px-5 py-2 rounded-lg">Delete Supplier</button>
            </>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Supplier Name</th>
              <th className="text-left p-2">Address</th>
              <th className="text-left p-2">TIN</th>
              <th className="text-left p-2">Contact</th>
              <th className="text-left p-2">Phone</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2">{s.address}</td>
                <td className="p-2">{s.tin || '—'}</td>
                <td className="p-2">{s.contact || '—'}</td>
                <td className="p-2">{s.phone || '—'}</td>
                <td className="p-2 text-center">
                  <button onClick={() => handleEdit(s)} className="text-blue-600 text-xs mr-2">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No suppliers yet for this branch</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
