'use client';

import { useState } from 'react';

const BRANCHES = [
  { id: 'anlurich', name: 'Anlurich OPC — Silang, Cavite' },
  { id: 'avenders', name: 'Avenders Auto Parts — Sta. Rosa' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
  { id: 'sezan', name: 'Sezan Baliwag Auto Parts' },
];

const PMS = [
  { name: 'Change Oil', price: 500 },
  { name: 'Brake Cleaning and Re-adjustment', price: 800 },
  { name: 'Coolant Flushing', price: 300 },
  { name: 'Brake and Clutch Fluid Flushing', price: 300 },
  { name: 'Spark Plug Change and Throttle Cleaning', price: 400 },
  { name: 'Fuel Filter Change', price: 500 },
  { name: 'Transmission Oil Change', price: 450 },
  { name: 'Differential Gear Oil Change', price: 450 },
];
const OTHER = ['Engine Diagnose', 'Underchasis Repair', 'Aircon Repair', 'Transmission Service'];

export default function BookingPage() {
  const [form, setForm] = useState({
    customerName: '', phone: '', plateNo: '', vehicle: '', branch: 'anlurich',
    date: '', time: '09:00', notes: '',
  });
  const [pms, setPms] = useState(false);
  const [pmsItems, setPmsItems] = useState<string[]>([]);
  const [other, setOther] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState('');

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggle = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };
  const pmsTotal = PMS.filter((item) => pmsItems.includes(item.name)).reduce((sum, item) => sum + item.price, 0);

  const save = async () => {
    if (!form.customerName.trim() || !form.phone.trim() || !form.date) return alert('Name, phone, and date are required.');
    if (!pms && other.length === 0) return alert('Select a service.');
    setSaving(true);
    const service = [
      pms ? `PMS: ${pmsItems.join(', ') || 'No item selected'}` : '',
      ...other,
    ].filter(Boolean).join(' | ');
    const row = { ...form, service, pms, pmsItems, other, pmsTotal, id: Date.now().toString(), status: 'Pending', createdAt: new Date().toISOString() };
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
          <div className="border rounded p-3">
            <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={pms} onChange={(e) => setPms(e.target.checked)} /> PMS Service Labor Cost</label>
            {pms && (
              <div className="mt-2 grid gap-1">
                {PMS.map((item) => (
                  <label key={item.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><input type="checkbox" checked={pmsItems.includes(item.name)} onChange={() => toggle(pmsItems, item.name, setPmsItems)} /> {item.name}</span>
                    <span>₱{item.price.toLocaleString()}.00</span>
                  </label>
                ))}
                <div className="text-right font-bold mt-1">PMS Labor Total ₱{pmsTotal.toLocaleString()}.00</div>
                <div className="text-xs text-gray-500 text-right">Labor only. Parts are not included.</div>
              </div>
            )}
          </div>
          {OTHER.map((item) => (
            <div key={item}>
              <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={other.includes(item)} onChange={() => toggle(other, item, setOther)} /> {item}</label>
              {other.includes(item) && <div className="text-sm text-green-700 ml-6">Free Check Up and Estimate</div>}
            </div>
          ))}
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
