'use client';

import { useState, useEffect } from 'react';

type Supplier = {
  id: string;
  name: string;
  address: string;
  tin?: string;
  contact?: string;
  phone?: string;
  email?: string;
};

const STORAGE_KEY = 'anlurich-suppliers';

const defaultSuppliers: Supplier[] = [
  { id: '1', name: 'GTX Auto Parts Trading', address: '123 Industrial Ave, Lipa City, Batangas', phone: '0917-111-1111' },
  { id: '2', name: 'Castrol Philippines', address: '456 Commerce St, Makati City', phone: '0917-222-2222' },
  { id: '3', name: 'KYB Suspension Corp', address: '789 Parts Road, Dasmariñas, Cavite', phone: '0917-333-3333' },
  { id: '4', name: 'Bosch Automotive', address: '321 Tech Park, Baliwag, Bulacan', phone: '0917-444-4444' },
];

function loadSuppliers(): Supplier[] {
  if (typeof window === 'undefined') return defaultSuppliers;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSuppliers));
      return defaultSuppliers;
    }
    return JSON.parse(raw);
  } catch {
    return defaultSuppliers;
  }
}

function saveSuppliers(suppliers: Supplier[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({ name: '', address: '', tin: '', contact: '', phone: '', email: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setSuppliers(loadSuppliers());
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Supplier name is required');
      return;
    }

    let updated: Supplier[];
    if (editingId) {
      updated = suppliers.map((s) =>
        s.id === editingId ? { ...s, ...form } : s
      );
    } else {
      const newSupplier: Supplier = {
        id: Date.now().toString(),
        name: form.name.trim(),
        address: form.address.trim(),
        tin: form.tin.trim() || undefined,
        contact: form.contact.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      };
      updated = [...suppliers, newSupplier];
    }

    setSuppliers(updated);
    saveSuppliers(updated);
    setForm({ name: '', address: '', tin: '', contact: '', phone: '', email: '' });
    setEditingId(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      address: supplier.address,
      tin: supplier.tin || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
    });
    setEditingId(supplier.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    saveSuppliers(updated);
  };

  const handleCancel = () => {
    setForm({ name: '', address: '', tin: '', contact: '', phone: '', email: '' });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Supplier Management</h1>
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
          <a href="/" className="text-blue-600 hover:underline">← Home</a>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Supplier' : 'Add New Supplier'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Supplier Name *</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. GTX Auto Parts Trading"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">TIN No.</label>
              <input
                className="border rounded-lg px-3 py-2"
                style={{ width: '20ch' }}
                maxLength={20}
                value={form.tin}
                onChange={(e) => handleChange('tin', e.target.value)}
                placeholder="TIN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Person</label>
              <input
                className="border rounded-lg px-3 py-2"
                style={{ width: '20ch' }}
                maxLength={20}
                value={form.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                placeholder="Contact name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Number</label>
              <input
                className="border rounded-lg px-3 py-2"
                style={{ width: '20ch' }}
                maxLength={20}
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="09xx-xxx-xxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@supplier.com"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Full address"
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="bg-green-600 text-white px-5 py-2 rounded-lg">
                {editingId ? 'Update Supplier' : 'Add Supplier'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="bg-gray-500 text-white px-5 py-2 rounded-lg">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow">
          <h2 className="text-lg font-semibold p-5 border-b">Suppliers ({suppliers.length})</h2>
          {suppliers.length === 0 ? (
            <p className="p-5 text-gray-500">No suppliers yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">TIN</th>
                    <th className="text-left p-3">Address</th>
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3">{s.tin || '—'}</td>
                      <td className="p-3">{s.address || '—'}</td>
                      <td className="p-3">{s.contact || '—'}</td>
                      <td className="p-3">{s.phone || '—'}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => handleEdit(s)} className="text-blue-600 text-xs mr-3">Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="text-red-600 text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
