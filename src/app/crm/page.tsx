'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

type Salesman = { id: string; name: string; phone: string; area: string; target: number; active: boolean };
type Lead = { id: string; salesmanId: string; customer: string; phone: string; plate: string; vehicle: string; status: string; nextDate: string; note: string; createdAt: string };

const STATUSES = ['New', 'Follow-up', 'Quoted', 'Won', 'Lost'];
const money = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

async function loadKey(key: string) {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) return JSON.parse(localStorage.getItem(key) || '[]');
    const rows: { key: string; value: string }[] = await res.json();
    const row = rows.find((r) => r.key === key);
    if (row?.value) { localStorage.setItem(key, row.value); return JSON.parse(row.value); }
  } catch {}
  return JSON.parse(localStorage.getItem(key) || '[]');
}
async function saveKey(key: string, value: unknown) {
  const text = JSON.stringify(value);
  localStorage.setItem(key, text);
  await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: text }) });
}

export default function CRMPage() {
  const [branch, setBranch] = useState('');
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<'people' | 'leads'>('people');
  const [person, setPerson] = useState({ name: '', phone: '', area: '', target: '' });
  const [lead, setLead] = useState({ salesmanId: '', customer: '', phone: '', plate: '', vehicle: '', status: 'New', nextDate: '', note: '' });
  const [filter, setFilter] = useState('');

  const sKey = `anlurich-crm-salesmen-${branch || 'all'}`;
  const lKey = `anlurich-crm-leads-${branch || 'all'}`;

  useEffect(() => {
    const id = currentBranch() || 'all';
    setBranch(id);
  }, []);

  useEffect(() => {
    if (!branch) return;
    loadKey(sKey).then((r) => setSalesmen(Array.isArray(r) ? r : []));
    loadKey(lKey).then((r) => setLeads(Array.isArray(r) ? r : []));
  }, [branch, sKey, lKey]);

  const addSalesman = async () => {
    if (!person.name.trim()) return alert('Enter salesman name');
    const next = [...salesmen, { id: Date.now().toString(), name: person.name.trim(), phone: person.phone.trim(), area: person.area.trim(), target: Number(person.target) || 0, active: true }];
    setSalesmen(next);
    await saveKey(sKey, next);
    setPerson({ name: '', phone: '', area: '', target: '' });
  };

  const addLead = async () => {
    if (!lead.customer.trim()) return alert('Enter customer name');
    const next = [{ id: Date.now().toString(), salesmanId: lead.salesmanId, customer: lead.customer.trim(), phone: lead.phone.trim(), plate: lead.plate.trim(), vehicle: lead.vehicle.trim(), status: lead.status, nextDate: lead.nextDate, note: lead.note.trim(), createdAt: new Date().toISOString() }, ...leads];
    setLeads(next);
    await saveKey(lKey, next);
    setLead({ salesmanId: '', customer: '', phone: '', plate: '', vehicle: '', status: 'New', nextDate: '', note: '' });
  };

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    const next = leads.map((l) => l.id === id ? { ...l, ...patch } : l);
    setLeads(next);
    await saveKey(lKey, next);
  };

  const removeLead = async (id: string) => {
    if (!confirm('Remove this lead?')) return;
    const next = leads.filter((l) => l.id !== id);
    setLeads(next);
    await saveKey(lKey, next);
  };

  const nameOf = (id: string) => salesmen.find((s) => s.id === id)?.name || '—';
  const shown = leads.filter((l) => !filter || l.salesmanId === filter || l.status === filter || `${l.customer} ${l.phone} ${l.plate}`.toLowerCase().includes(filter.toLowerCase()));
  const due = leads.filter((l) => l.nextDate && l.nextDate <= new Date().toISOString().slice(0, 10) && l.status !== 'Won' && l.status !== 'Lost');

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">CRM — Salesman</h1>
      <p className="text-sm text-gray-500 mb-4">Follow-ups, leads, and targets for salesman personnel</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl shadow p-3 text-center"><div className="text-xs">Salesmen</div><div className="text-2xl font-black">{salesmen.length}</div></div>
        <div className="bg-white rounded-xl shadow p-3 text-center"><div className="text-xs">Open leads</div><div className="text-2xl font-black">{leads.filter((l) => !['Won', 'Lost'].includes(l.status)).length}</div></div>
        <div className="bg-amber-50 rounded-xl shadow p-3 text-center"><div className="text-xs">Due follow-ups</div><div className="text-2xl font-black">{due.length}</div></div>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('people')} className={`px-4 py-2 rounded ${tab === 'people' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}>Salesmen</button>
        <button onClick={() => setTab('leads')} className={`px-4 py-2 rounded ${tab === 'leads' ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>Leads and Follow-ups</button>
      </div>

      {tab === 'people' && (
        <>
          <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
            <input className="border rounded px-3 py-2" placeholder="Name" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Phone" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Area" value={person.area} onChange={(e) => setPerson({ ...person, area: e.target.value })} />
            <input type="number" className="border rounded px-3 py-2" placeholder="Monthly target" value={person.target} onChange={(e) => setPerson({ ...person, target: e.target.value })} />
            <button onClick={addSalesman} className="bg-blue-700 text-white rounded px-3 py-2">Add Salesman</button>
          </div>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-700 text-white"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Area</th><th className="p-2 text-right">Target</th><th className="p-2 text-right">Open leads</th></tr></thead>
              <tbody>
                {salesmen.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">{s.phone}</td>
                    <td className="p-2">{s.area}</td>
                    <td className="p-2 text-right">{money(s.target)}</td>
                    <td className="p-2 text-right">{leads.filter((l) => l.salesmanId === s.id && !['Won', 'Lost'].includes(l.status)).length}</td>
                  </tr>
                ))}
                {salesmen.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">No salesman yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'leads' && (
        <>
          <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
            <select className="border rounded px-3 py-2" value={lead.salesmanId} onChange={(e) => setLead({ ...lead, salesmanId: e.target.value })}>
              <option value="">Salesman</option>
              {salesmen.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="border rounded px-3 py-2" placeholder="Customer" value={lead.customer} onChange={(e) => setLead({ ...lead, customer: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Phone" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Plate" value={lead.plate} onChange={(e) => setLead({ ...lead, plate: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Vehicle" value={lead.vehicle} onChange={(e) => setLead({ ...lead, vehicle: e.target.value })} />
            <select className="border rounded px-3 py-2" value={lead.status} onChange={(e) => setLead({ ...lead, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input type="date" className="border rounded px-3 py-2" value={lead.nextDate} onChange={(e) => setLead({ ...lead, nextDate: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Note" value={lead.note} onChange={(e) => setLead({ ...lead, note: e.target.value })} />
            <button onClick={addLead} className="bg-teal-600 text-white rounded px-3 py-2 md:col-span-4">Add Lead / Follow-up</button>
          </div>
          <div className="mb-2">
            <input className="border rounded px-3 py-2" placeholder="Filter by salesman, status, customer" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teal-600 text-white"><tr><th className="p-2 text-left">Customer</th><th className="p-2 text-left">Salesman</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Next</th><th className="p-2 text-left">Note</th><th className="p-2"></th></tr></thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">{l.customer}<div className="text-xs text-gray-500">{l.phone} · {l.plate} · {l.vehicle}</div></td>
                    <td className="p-2">{nameOf(l.salesmanId)}</td>
                    <td className="p-2">
                      <select className="border rounded px-1 py-1" value={l.status} onChange={(e) => updateLead(l.id, { status: e.target.value })}>
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-2">{l.nextDate || '—'}</td>
                    <td className="p-2">{l.note}</td>
                    <td className="p-2 text-right"><button onClick={() => removeLead(l.id)} className="text-red-600">Delete</button></td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No leads</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
