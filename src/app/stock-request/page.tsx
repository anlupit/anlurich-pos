'use client';

import { useState } from 'react';

export default function StockRequestPage() {
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  const submit = () => {
    if (!partNumber.trim()) return alert('Enter part number');
    const req = { id: Date.now().toString(), partNumber, description, qty, notes, date: new Date().toISOString(), status: 'Pending' };
    const existing = JSON.parse(localStorage.getItem('anlurich-stock-requests') || '[]');
    const updated = [req, ...existing];
    localStorage.setItem('anlurich-stock-requests', JSON.stringify(updated));
    setRequests(updated);
    setPartNumber('');
    setDescription('');
    setQty(1);
    setNotes('');
    alert('Stock request submitted');
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Stock Request</h1>
      <div className="bg-white rounded-xl shadow p-5 max-w-lg mb-6">
        <div className="space-y-3">
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Part Number" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="number" min={1} className="w-full border rounded-lg px-3 py-2" placeholder="Quantity" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} />
          <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button onClick={submit} className="bg-blue-600 text-white px-5 py-2 rounded-lg">Submit Request</button>
        </div>
      </div>
    </div>
  );
}
