'use client';

import { useEffect, useState } from 'react';
import { compressImage } from '../../lib/compressImage';
import { currentBranch } from '../../lib/branchData';

type Expense = {
  id: string;
  date: string;
  category: string;
  payee: string;
  reference: string;
  amount: number;
  vat: number;
  notes: string;
  image?: string;
  branch: string;
};

const CATEGORIES = [
  'Utilities - Meralco',
  'Utilities - PLDT',
  'Utilities - Prime Water',
  'Utilities - Internet / Other',
  'Auto Sweep / EasyTrip RFID',
  'Rentals',
  'Office Supplies',
  'Fuel and Oil',
  'Repairs and Maintenance',
  'Transportation and Delivery',
  'Communication',
  'Insurance',
  'Professional Fees',
  'Taxes and Licenses',
  'Representation',
  'Salaries and Wages',
  'Miscellaneous',
];

const BRANCHES = [
  { id: 'anlurich', name: 'ANLURICH OPC' },
  { id: 'avenders', name: 'Avenders' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
  { id: 'sezan', name: 'Sezan' },
  { id: 'timitsu', name: 'Timitsu' },
];

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function loadExpenses(branch: string): Promise<Expense[]> {
  const key = `anlurich-expenses-${branch}`;
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (res.ok) {
      const rows: { key: string; value: string }[] = await res.json();
      const row = rows.find((r) => r.key === key);
      if (row?.value) {
        localStorage.setItem(key, row.value);
        return JSON.parse(row.value);
      }
    }
  } catch {}
  return JSON.parse(localStorage.getItem(key) || '[]');
}

async function saveExpenses(branch: string, rows: Expense[]) {
  const key = `anlurich-expenses-${branch}`;
  localStorage.setItem(key, JSON.stringify(rows));
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: JSON.stringify(rows) }),
  });
}

export default function ExpensesPage() {
  const [branch, setBranch] = useState('');
  const [rows, setRows] = useState<Expense[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: CATEGORIES[0],
    payee: '',
    reference: '',
    amount: '',
    vat: '',
    notes: '',
    image: '',
  });
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [personal, setPersonal] = useState<Expense[]>([]);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pYear, setPYear] = useState('');
  const [pMonth, setPMonth] = useState('');

  useEffect(() => {
    const b = currentBranch() || 'unknown';
    setBranch(b);
    setSelectedBranch(b === 'admin' ? 'anlurich' : b);
    loadExpenses(b === 'admin' ? 'anlurich' : b).then(setRows);
    if (b === 'admin') loadExpenses('admin-personal').then(setPersonal);
  }, []);

  const save = async () => {
    if (!form.payee.trim() || !form.amount) return alert('Payee and amount are required');
    const target = branch === 'admin' ? selectedBranch : branch;
    const item: Expense = {
      id: editing || Date.now().toString(),
      date: form.date,
      category: form.category,
      payee: form.payee.trim(),
      reference: form.reference.trim(),
      amount: Number(Number(form.amount).toFixed(2)),
      vat: Number(Number(form.vat || 0).toFixed(2)),
      notes: form.notes.trim(),
      image: form.image,
      branch: target,
    };
    const next = editing ? rows.map((r) => (r.id === editing ? item : r)) : [item, ...rows];
    setRows(next);
    await saveExpenses(target, next);
    setEditing(null);
    setForm({ date: new Date().toISOString().slice(0, 10), category: CATEGORIES[0], payee: '', reference: '', amount: '', vat: '', notes: '', image: '' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    const target = branch === 'admin' ? selectedBranch : branch;
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    await saveExpenses(target, next);
  };

  const filtered = rows.filter((r) => {
    const d = String(r.date || '');
    if (year && !d.startsWith(year)) return false;
    if (month && d.slice(5, 7) !== month) return false;
    return true;
  });
  const total = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const vatTotal = filtered.reduce((s, r) => s + (r.vat || 0), 0);

  const onImage = async (file?: File) => {
    if (!file) return;
    setForm((f) => ({ ...f, image: '' }));
    const image = await compressImage(file);
    setForm((f) => ({ ...f, image }));
  };

  const printSummary = () => window.print();
  const download = () => {
    const header = 'Date,Category,Payee,Reference,Amount,VAT,Notes';
    const lines = filtered.map((r) => [r.date, r.category, r.payee, r.reference, r.amount.toFixed(2), r.vat.toFixed(2), r.notes].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...lines, `"","","","TOTAL","${total.toFixed(2)}","${vatTotal.toFixed(2)}",""`].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `company-expenses-${branch === 'admin' ? selectedBranch : branch}-${year || 'all'}${month ? '-' + month : ''}.csv`;
    a.click();
  };

  const savePersonal = async () => {
    if (!form.payee.trim() || !form.amount) return alert('Payee and amount are required');
    const item: Expense = {
      id: Date.now().toString(),
      date: form.date,
      category: form.category,
      payee: form.payee.trim(),
      reference: form.reference.trim(),
      amount: Number(Number(form.amount).toFixed(2)),
      vat: Number(Number(form.vat || 0).toFixed(2)),
      notes: form.notes.trim(),
      image: form.image,
      branch: 'admin-personal',
    };
    const next = [item, ...personal];
    setPersonal(next);
    await saveExpenses('admin-personal', next);
    setForm({ date: new Date().toISOString().slice(0, 10), category: CATEGORIES[0], payee: '', reference: '', amount: '', vat: '', notes: '', image: '' });
  };
  const personalFiltered = personal.filter((r) => {
    const d = String(r.date || '');
    if (pYear && !d.startsWith(pYear)) return false;
    if (pMonth && d.slice(5, 7) !== pMonth) return false;
    return true;
  });
  const personalTotal = personalFiltered.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-1">Company Expense</h1>
      <p className="text-xs text-gray-500 mb-4">Private per branch · for BIR expense reports</p>

      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input type="date" className="border rounded px-3 py-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <select className="border rounded px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="border rounded px-3 py-2" placeholder="Payee / Supplier" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="OR / Invoice No." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        <input type="number" step="0.01" className="border rounded px-3 py-2" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input type="number" step="0.01" className="border rounded px-3 py-2" placeholder="VAT amount" value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} />
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <label className="border rounded px-3 py-2 text-center cursor-pointer">
          Upload Invoice
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
        </label>
        <label className="border rounded px-3 py-2 text-center cursor-pointer">
          Back Camera
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
        </label>
        <button onClick={save} className="bg-blue-700 text-white rounded px-4 py-2">{editing ? 'Update Expense' : 'Save Expense'}</button>
      </div>

      {branch === 'admin' && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="font-semibold mb-2">Search branch expense</div>
          <div className="flex flex-wrap gap-2">
            <select className="border rounded px-3 py-2" value={selectedBranch} onChange={(e) => { setSelectedBranch(e.target.value); loadExpenses(e.target.value).then(setRows); }}>
              {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={download} className="bg-gray-700 text-white rounded px-4 py-2 text-sm">Download Summary</button>
            <button onClick={printSummary} className="bg-blue-700 text-white rounded px-4 py-2 text-sm">Print Summary</button>
          </div>
        </div>
      )}
      <div className="flex gap-2 mb-3 items-center">
        <input className="border rounded px-3 py-2 w-28" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
        <select className="border rounded px-3 py-2" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All months</option>
          {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={download} className="bg-gray-700 text-white rounded px-4 py-2 text-sm">Download Expense Summary</button>
        <div className="ml-auto text-sm">Total: <b>{money(total)}</b> · VAT: <b>{money(vatTotal)}</b></div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-600 text-white">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Payee</th>
              <th className="p-2 text-left">Reference</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-right">VAT</th>
              <th className="p-2 text-center">Photo</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.date}</td>
                <td className="p-2">{r.category}</td>
                <td className="p-2">{r.payee}</td>
                <td className="p-2">{r.reference}</td>
                <td className="p-2 text-right">{money(r.amount)}</td>
                <td className="p-2 text-right">{money(r.vat)}</td>
                <td className="p-2 text-center">{r.image ? <img src={r.image} alt="invoice" className="w-12 h-12 object-cover mx-auto cursor-pointer" onClick={() => setEnlarged(r.image || null)} /> : '—'}</td>
                <td className="p-2 text-right">
                  <button onClick={() => { setEditing(r.id); setForm({ date: r.date, category: r.category, payee: r.payee, reference: r.reference, amount: String(r.amount), vat: String(r.vat), notes: r.notes, image: r.image || '' }); }} className="text-blue-600 mr-2">Edit</button>
                  <button onClick={() => remove(r.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {enlarged && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEnlarged(null)}>
          <img src={enlarged} alt="Invoice" className="max-h-[90vh] max-w-full" />
        </div>
      )}
      {branch === 'admin' && (
        <div className="bg-white rounded-xl shadow p-4 mt-4">
          <h2 className="font-bold mb-2">Admin Personal Expense</h2>
          {!unlocked ? (
            <div className="flex gap-2">
              <input className="border rounded px-3 py-2" type="password" placeholder="Passcode" value={pin} onChange={(e) => setPin(e.target.value)} />
              <button onClick={() => setUnlocked(pin === '1781' || (alert('Wrong passcode'), false))} className="bg-black text-white px-4 py-2 rounded">View</button>
            </div>
          ) : (
            <>
              <button onClick={savePersonal} className="bg-black text-white px-4 py-2 rounded mb-3">Save Personal Expense</button>
              <div className="flex gap-2 mb-3">
                <input className="border rounded px-3 py-2 w-24" placeholder="Year" value={pYear} onChange={(e) => setPYear(e.target.value)} />
                <select className="border rounded px-3 py-2" value={pMonth} onChange={(e) => setPMonth(e.target.value)}>
                  <option value="">All months</option>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="font-bold mb-2">Summary: {money(personalTotal)}</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-100"><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Payee</th><th className="text-right p-2">Amount</th></tr></thead>
                <tbody>
                  {personalFiltered.map((r) => <tr key={r.id} className="border-t"><td className="p-2">{r.date}</td><td className="p-2">{r.payee}</td><td className="p-2 text-right">{money(r.amount)}</td></tr>)}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
