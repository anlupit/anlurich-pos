'use client';

import { useState } from 'react';

const BRANCHES = [
  { id: 'anlurich', name: 'Anlurich OPC — Silang, Cavite' },
  { id: 'avenders', name: 'Avenders Auto Parts — Sta. Rosa' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
  { id: 'sezan', name: 'Sezan Baliwag Auto Parts' },
];

const SERVICES = ['Oil Change', 'Brake Check', 'Periodic Maintenance', 'Aircon Service', 'Battery Check', 'General Checkup', 'Other'];

export default function BookingPage() {
  const [form, setForm] = useState({
    customerName: '', phone: '', plateNo: '', vehicle: '', branch: 'anlurich',
    service: 'Periodic Maintenance', date: '', time: '09:00', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState('');

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    if (!form.customerName.trim() || !form.phone.trim() || !form.date) return alert('Name, phone, and date are required.');
    setSaving(true);
    const row = { ...form, id: Date.now().toString(), status: 'Pending', createdAt: new Date().toISOString() };
    const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || body.ok === false) return alert(body.error || 'Booking was not saved.');
    setDone(body.id);
  };

  if (done) return (
    <div className="min-h-screen p-4" style={{ background: '#f4f6fb' }}>
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 text-center mt-10">
        <img src="/logo.png" alt="Anlurich" className="h-16 mx-auto object-contain" />
        <h1 className="text-2xl font-black mt-3" style={{ color: '#002366' }}>Booking Received</h1>
        <p className="mt-2">Reference No. {done}</p>
        <p className="text-gray-600 mt-2">We will confirm your service schedule by phone.</p>
        <button onClick={() => { setDone(''); setForm({ ...form, notes: '' }); }} className="mt-4 bg-blue-700 text-white px-5 py-2 rounded-lg">Book Another</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4" style={{ background: '#f4f6fb' }}>
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow overflow-hidden">
        <img src="/booking-banner.jpg" alt="Anlurich Auto Parts" className="w-full h-auto block" />
        <div className="p-5">
          <label className="text-sm font-medium">Customer Name<input className="border rounded px-3 py-2 w-full mt-1" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} /></label>
          <label className="text-sm font-medium">Contact Number<input className="border rounded px-3 py-2 w-full mt-1" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
          <label className="text-sm font-medium">Plate No.<input className="border rounded px-3 py-2 w-full mt-1" value={form.plateNo} onChange={(e) => set('plateNo', e.target.value)} /></label>
          <label className="text-sm font-medium">Vehicle<input className="border rounded px-3 py-2 w-full mt-1" placeholder="Toyota Innova 2015" value={form.vehicle} onChange={(e) => set('vehicle', e.target.value)} /></label>
          <label className="text-sm font-medium">Branch
            <select className="border rounded px-3 py-2 w-full mt-1" value={form.branch} onChange={(e) => set('branch', e.target.value)}>
              {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Service
            <select className="border rounded px-3 py-2 w-full mt-1" value={form.service} onChange={(e) => set('service', e.target.value)}>
              {SERVICES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">Date<input type="date" className="border rounded px-3 py-2 w-full mt-1" value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
            <label className="text-sm font-medium">Time<input type="time" className="border rounded px-3 py-2 w-full mt-1" value={form.time} onChange={(e) => set('time', e.target.value)} /></label>
          </div>
          <label className="text-sm font-medium">Notes<textarea className="border rounded px-3 py-2 w-full mt-1" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>
          <button onClick={save} disabled={saving} className="bg-green-600 text-white py-3 rounded-lg font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Book Service'}</button>
        </div>
      </div>
    </div>
  );
}
